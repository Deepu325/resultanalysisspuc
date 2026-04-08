from apps.results.models import StudentResult, UploadLog
from apps.results.services.excel_reader import read_excel
from apps.results.services.cleaner import clean_data, validate_cleaned_data
from apps.results.services.validation_gate import ValidationGate, ValidationGateError
from apps.results.services.deduplicator import (
    deduplicate_upload,
    cleanup_database_duplicates,
    report_deduplication
)
import pandas as pd


def process_upload(file, upload_log=None):
    """
    Main service to process uploaded Excel file with quality tracking
    
    Pipeline:
        1. Read Excel
        2. Clean data (PART 1)
        3. Validate cleaned data
        4. VALIDATION GATE (hard-stop before database) ← CRITICAL
        5. Save to database
        6. Generate snapshot
        7. Update upload log
    
    Args:
        file: Django UploadedFile object
        upload_log: UploadLog instance (optional) for tracking
        
    Returns:
        Tuple of (success, records_created, quality_metrics, error_message)
    """
    try:
        # Read Excel file
        raw_df = read_excel(file)
        
        # Clean data (returns DataFrame and quality metrics)
        clean_df, quality_metrics = clean_data(raw_df)
        
        # STEP 2A: Deduplicate incoming data (CRITICAL - force removal)
        clean_df, upload_dedup_stats = deduplicate_upload(clean_df)
        if upload_dedup_stats["records_removed"] > 0:
            quality_metrics["upload_duplicates_removed"] = upload_dedup_stats["records_removed"]
        
        # VERIFY: Double-check no duplicates remain in critical columns
        if 'reg_no' in clean_df.columns:
            remaining_dupes = clean_df[clean_df.duplicated(subset=['reg_no'], keep=False)]
            if len(remaining_dupes) > 0:
                error_msg = f"CRITICAL: Deduplicator failed! Still have {len(remaining_dupes)} duplicate records"
                if upload_log:
                    upload_log.status = "FAILED"
                    upload_log.error_message = error_msg
                    upload_log.save()
                return False, 0, quality_metrics, error_msg
        
        # Validate cleaned data
        is_valid, error = validate_cleaned_data(clean_df, quality_metrics)
        if not is_valid:
            if upload_log:
                upload_log.status = "FAILED"
                upload_log.error_message = error
                upload_log.save()
            return False, 0, quality_metrics, error
        
        # STEP 2B: Cleanup existing database duplicates before validation
        db_dedup_stats = cleanup_database_duplicates(upload_log)
        if db_dedup_stats["records_deleted"] > 0:
            quality_metrics["db_duplicates_removed"] = db_dedup_stats["records_deleted"]
        
        # CRITICAL: Validation Gate - Hard-stop before database
        upload_id = upload_log.id if upload_log else None
        try:
            is_valid, validation_msg = ValidationGate.validate_before_insert(
                clean_df,
                upload_id=upload_id,
            )
            if not is_valid:
                if upload_log:
                    upload_log.status = "FAILED"
                    upload_log.error_message = validation_msg
                    upload_log.save()
                return False, 0, quality_metrics, validation_msg
        except ValidationGateError as e:
            # Contract violation - hard-fail
            error_msg = str(e)
            if upload_log:
                upload_log.status = "FAILED"
                upload_log.error_message = error_msg
                upload_log.save()
            return False, 0, quality_metrics, error_msg
        
        # Pre-calculate numeric columns for subject marks (do this once, not per row)
        # Only include columns that start with 'marks_' or are actual subject names (English, Maths, etc.)
        subject_keywords = {'marks_', 'english', 'maths', 'science', 'history', 'geography', 'civics', 
                           'physics', 'chemistry', 'biology', 'hindi', 'sanskrit', 'social', 'studies',
                           'economics', 'environmental', 'language', 'literature', 'computer', 'IT',
                           'accountancy', 'business', 'statistics', 'psychology'}
        
        numeric_cols = [
            col for col in clean_df.columns 
            if any(keyword in col.lower() for keyword in subject_keywords)
            and pd.api.types.is_numeric_dtype(clean_df[col])
        ]
        
        # Bulk create or update records
        records_created = 0
        for _, row in clean_df.iterrows():
            # Extract subject marks using pre-calculated numeric columns
            subject_marks = {}
            for col in numeric_cols:
                value = row.get(col)
                if pd.notna(value):
                    # Clean column name for display
                    subject_name = col.replace('marks_', '').replace('_', ' ').upper()
                    subject_marks[subject_name] = float(value)
            
            # Extract language (K/H/S)
            language_val = None
            if 'language' in row and pd.notna(row.get('language')):
                lang = str(row.get('language')).strip().upper()
                if lang in ['K', 'H', 'S']:
                    language_val = lang
            
            obj, created = StudentResult.objects.update_or_create(
                reg_no=row["reg_no"],
                defaults={
                    "student_name": row.get("student_name"),
                    "stream": row.get("stream", "UNKNOWN"),
                    "section": row.get("section", "UNKNOWN"),
                    "percentage": row.get("percentage"),
                    "grand_total": row.get("grand_total"),
                    "result_class": row.get("result_class", "INCOMPLETE"),
                    "subject_marks_data": subject_marks,
                    "language": language_val,
                    "data_completeness_score": row.get("data_completeness_score", 0),
                    "percentage_was_filled": quality_metrics["missing_percentage_filled"] > 0,
                    "data_version": "v1.0",  # PRODUCTION: Set versioning
                    "processing_version": "cleaner_v1",  # PRODUCTION: Track cleaner version
                    "upload_log": upload_log,  # Link to upload
                }
            )
            if created:
                records_created += 1
        
        # Update upload log with metrics
        if upload_log:
            # Determine status
            if quality_metrics.get("has_warnings", False):
                status_value = "SUCCESS_WITH_WARNINGS"
            else:
                status_value = "SUCCESS"
            
            upload_log.status = status_value
            upload_log.records_processed = quality_metrics["original_records"]
            upload_log.records_kept = len(clean_df)
            
            # Data integrity metrics (includes deduplication stats)
            upload_log.invalid_reg_no_removed = quality_metrics["invalid_reg_no_removed"]
            upload_log.duplicates_removed = quality_metrics.get("upload_duplicates_removed", 0)
            
            # Add database cleanup info to status message
            if db_dedup_stats["records_deleted"] > 0:
                upload_log.status_message = (
                    f"Upload: {upload_dedup_stats['records_removed']} duplicates removed; "
                    f"Database: {db_dedup_stats['records_deleted']} duplicates cleaned"
                )
            upload_log.missing_grand_total_removed = quality_metrics["missing_grand_total_removed"]
            upload_log.missing_percentage_filled = quality_metrics["missing_percentage_filled"]
            upload_log.invalid_percentage_corrected = quality_metrics["invalid_percentage_corrected"]
            
            # Data validation metrics (NEW)
            upload_log.section_mismatches = quality_metrics.get("section_mismatches", 0)
            upload_log.total_mismatches = quality_metrics.get("total_mismatches", 0)
            upload_log.percentage_mismatches = quality_metrics.get("percentage_mismatches", 0)
            upload_log.alternate_identifiers_found = quality_metrics.get("alternate_identifiers_found", 0)
            
            # Quality score
            upload_log.retention_rate = quality_metrics["retention_rate"]
            
            # PRODUCTION: Set versioning
            upload_log.data_version = "v1.0"
            upload_log.processing_version = "cleaner_v1"
            
            upload_log.save()
        
        # PRODUCTION: Generate analytics snapshot for this upload
        # This caches the analytics so API can return <100ms response
        try:
            from apps.results.services.snapshot import SnapshotManager
            from apps.results.services.snapshot import SnapshotManager
            
            # Invalidate global/stream/section caches (new data available)
            SnapshotManager.invalidate_all_caches()
            
            # Generate snapshot for this specific upload
            if upload_log:
                snapshot_result = SnapshotManager.compute_and_cache_upload_analytics(
                    upload_log.id
                )
                if not snapshot_result.get('success'):
                    # Log snapshot error but don't fail upload
                    import logging
                    logger = logging.getLogger('analytics')
                    logger.warning(
                        f"Failed to generate snapshot for upload {upload_log.id}: "
                        f"{snapshot_result.get('error')}"
                    )
        except Exception as e:
            # Snapshot generation error - log but don't fail
            import logging
            logger = logging.getLogger('snapshots')
            logger.warning(f"Snapshot generation error: {str(e)}")
        
        return True, records_created, quality_metrics, None
        
    except Exception as e:
        error_msg = str(e)
        if upload_log:
            upload_log.status = "FAILED"
            upload_log.error_message = error_msg
            upload_log.save()
        return False, 0, {}, error_msg

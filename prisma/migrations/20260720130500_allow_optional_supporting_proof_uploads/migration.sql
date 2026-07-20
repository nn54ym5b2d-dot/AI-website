ALTER TABLE "upload_intents"
DROP CONSTRAINT "upload_intents_uploadable_type";

ALTER TABLE "upload_intents"
ADD CONSTRAINT "upload_intents_uploadable_type"
CHECK ("file_type" IN ('original', 'person_proof', 'supporting_proof'));

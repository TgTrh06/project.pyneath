# Study steps migration and rollback draft

Migration `0006_study_steps.sql` creates a private per-account, per-session record with cascade deletion. Existing sessions are not backfilled. Review and explicit authorization are required before applying any migration, including on a disposable database.

Rollback requires a verified backup and stopping writes. Dropping `study_steps` permanently deletes all recorded steps and notes created after migration. Restore the prior application and database from backup, or, only after reviewing the migration journal and consequences, drop the table and reconcile the Drizzle migration journal in a transaction. Do not edit the journal blindly; an incorrect journal can prevent or repeat later migrations. Verify account deletion/export and prior session flows after rollback.

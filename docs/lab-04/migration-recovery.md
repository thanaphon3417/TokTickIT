# Lab 4 database migration and recovery

The Lab 4 migration is additive: it adds `Ticket.version` (default `1`), `Ticket.resolutionReason`, the `TicketAction` table, indexes, and foreign keys. Existing tickets and related Lab 1–3 rows are retained; existing tickets receive version `1` and no synthetic actions.

## Before applying to a persistent database

From `server/`, confirm the configured `DATABASE_URL` points to the intended database and take a custom-format PostgreSQL backup:

```powershell
$urlLine = Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
$databaseUrl = ($urlLine -replace '^DATABASE_URL=', '').Trim('"')
$backup = "toktickit-before-lab4-$(Get-Date -Format yyyyMMdd-HHmmss).dump"
pg_dump "$databaseUrl" --format=custom --file=$backup
npx.cmd prisma migrate deploy
```

Keep the backup outside the repository and verify `pg_dump` exits successfully before migrating. Verify the migration with `npx.cmd prisma migrate status` and inspect a pre-existing ticket: it should still exist with `version = 1`; it should have zero action rows unless actions were subsequently recorded.

## Recovery rehearsal on a disposable database

Use an empty disposable database URL in `LAB4_RECOVERY_DATABASE_URL`; never point this procedure at the class/shared or production database. Restore the pre-migration dump to that database, run the migration there, and verify its Lab 3 ticket/user/comment/note/attachment counts. To rehearse rollback, restore the same pre-migration dump again into a second disposable database and verify those same baseline records. Recovery is a full backup restore: dropping the new objects would discard Lab 4 actions and ticket version/reason data.

```powershell
$pgUser = "toktickit"
$recoveryDb = "toktickit_lab4_recovery"
createdb --host=localhost --username=$pgUser $recoveryDb
pg_restore --host=localhost --username=$pgUser --dbname=$recoveryDb --clean --if-exists $backup
$env:DATABASE_URL = $databaseUrl -replace '/toktickit(?=\?)', "/$recoveryDb"
npx.cmd prisma migrate deploy
npx.cmd prisma migrate status
Remove-Item Env:DATABASE_URL
```

## Rehearsal record (2026-10-12)

Rehearsed with the local PostgreSQL 17 container using two new disposable databases, `toktickit_lab4_recovery` and `toktickit_lab4_rollback`. A custom-format pre-migration backup was saved outside the repository at `%TEMP%\toktickit-pre-lab4-20261012-180924.dump`. The first disposable database was restored from it and migrated; the second was restored from the same backup to rehearse recovery. Both restores retained 287 tickets, 10 users, 1 public comment, 0 internal notes, and 258 attachments. The migrated copy had 0 actions before seed and all 287 legacy tickets at version 1. Running the seed twice on that migrated copy left exactly 3 demo actions, with 1 demo ticket having zero actions, 1 having one, and 1 having two. Both disposable databases were retained for review.

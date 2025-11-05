# Complytex setup (Azure SQL)

1) Create database Complytex (done by you). Ensure the same server/credentials.
2) Run the SQL scripts in order against Complytex:
   - db/complytex_schema.sql  (adds Users.EmailVerified, VisitorLogs, Billing, Support, etc.)
   - db/complytex_seed.sql
   - db/complytex_procs.sql

You can execute them via Azure Data Studio or sqlcmd:

sqlcmd -S {{AZURE_SQL_SERVER}} -d Complytex -U {{AZURE_SQL_USERNAME}} -P {{AZURE_SQL_PASSWORD}} -i db/complytex_schema.sql
sqlcmd -S {{AZURE_SQL_SERVER}} -d Complytex -U {{AZURE_SQL_USERNAME}} -P {{AZURE_SQL_PASSWORD}} -i db/complytex_seed.sql
sqlcmd -S {{AZURE_SQL_SERVER}} -d Complytex -U {{AZURE_SQL_USERNAME}} -P {{AZURE_SQL_PASSWORD}} -i db/complytex_procs.sql

3) Copy .env.example to .env and set AZURE_SQL_PASSWORD; confirm AZURE_SQL_DATABASE=Complytex.
4) Start the web UI:

npm run web

Open http://localhost:3000/register to create the first Owner.

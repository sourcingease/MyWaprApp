"""
Example: Azure SQL Database integration with Python
This demonstrates how to connect the agent to your Azure SQL Database
"""

import asyncio
import pyodbc
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
import os
from datetime import datetime, timedelta
import logging

class AzureSQLConnector:
    def __init__(self):
        self.connection = None
        self.connection_string = self._build_connection_string()
        
    def _build_connection_string(self):
        """Build connection string with SQL authentication"""
        server = os.getenv('AZURE_SQL_SERVER', 'zlnsw9feuf.database.windows.net')
        database = os.getenv('AZURE_SQL_DATABASE', 'SeApp2')
        username = os.getenv('AZURE_SQL_USERNAME', 'turtle')
        password = os.getenv('AZURE_SQL_PASSWORD')
        
        if not password:
            raise ValueError("AZURE_SQL_PASSWORD environment variable is required")
        
        # Using SQL authentication (for development)
        connection_string = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server=tcp:{server},1433;"
            f"Database={database};"
            f"UID={username};"
            f"PWD={password};"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
            f"Connection Timeout=30;"
        )
        
        # Alternative: Azure AD authentication for production
        # Uncomment below and comment above for Azure AD:
        """
        connection_string = (
            f"Driver={{ODBC Driver 18 for SQL Server}};"
            f"Server=tcp:{server},1433;"
            f"Database={database};"
            f"Authentication=ActiveDirectoryMsi;"
            f"Encrypt=yes;"
            f"TrustServerCertificate=no;"
            f"Connection Timeout=30;"
        )
        """
        
        return connection_string
    
    async def connect(self):
        """Connect to Azure SQL Database"""
        try:
            self.connection = pyodbc.connect(self.connection_string)
            logging.info("Connected to Azure SQL Database")
            return self.connection
        except Exception as e:
            logging.error(f"Database connection failed: {e}")
            raise
    
    async def monitor_new_records(self, table_name: str, last_check_time: datetime):
        """Monitor for new records since last check"""
        try:
            cursor = self.connection.cursor()
            
            query = f"""
                SELECT * FROM {table_name} 
                WHERE CreatedDate > ? 
                ORDER BY CreatedDate DESC
            """
            
            cursor.execute(query, last_check_time)
            records = cursor.fetchall()
            
            # Convert to list of dictionaries
            columns = [column[0] for column in cursor.description]
            result = [dict(zip(columns, row)) for row in records]
            
            cursor.close()
            return result
            
        except Exception as e:
            logging.error(f"Monitor query failed: {e}")
            raise
    
    async def run_maintenance_task(self):
        """Execute automated maintenance tasks"""
        try:
            cursor = self.connection.cursor()
            
            # Example: Update statistics
            cursor.execute("UPDATE STATISTICS your_table_name")
            
            # Example: Clean up old records
            cleanup_query = """
                DELETE FROM audit_logs 
                WHERE created_date < DATEADD(day, -30, GETDATE())
            """
            
            cursor.execute(cleanup_query)
            rows_affected = cursor.rowcount
            
            self.connection.commit()
            cursor.close()
            
            logging.info(f"Cleaned up {rows_affected} old records")
            return rows_affected
            
        except Exception as e:
            logging.error(f"Maintenance task failed: {e}")
            raise
    
    async def execute_custom_query(self, query: str, params=None):
        """Execute custom SQL query"""
        try:
            cursor = self.connection.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if query.strip().upper().startswith('SELECT'):
                records = cursor.fetchall()
                columns = [column[0] for column in cursor.description]
                result = [dict(zip(columns, row)) for row in records]
                cursor.close()
                return result
            else:
                self.connection.commit()
                rows_affected = cursor.rowcount
                cursor.close()
                return rows_affected
                
        except Exception as e:
            logging.error(f"Query execution failed: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from database"""
        if self.connection:
            self.connection.close()
            logging.info("Disconnected from Azure SQL Database")

class SaaSAgent:
    def __init__(self):
        self.sql_connector = AzureSQLConnector()
        self.running = False
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    async def start(self):
        """Start the SaaS agent"""
        await self.sql_connector.connect()
        self.running = True
        
        # Start monitoring and maintenance tasks
        await asyncio.gather(
            self.monitoring_loop(),
            self.maintenance_loop()
        )
    
    async def monitoring_loop(self):
        """Run monitoring tasks every 5 minutes"""
        while self.running:
            try:
                await self.perform_monitoring()
                await asyncio.sleep(5 * 60)  # 5 minutes
            except Exception as e:
                logging.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def maintenance_loop(self):
        """Run maintenance tasks daily"""
        while self.running:
            try:
                await self.perform_maintenance()
                await asyncio.sleep(24 * 60 * 60)  # 24 hours
            except Exception as e:
                logging.error(f"Maintenance loop error: {e}")
                await asyncio.sleep(60 * 60)  # Wait 1 hour before retry
    
    async def perform_monitoring(self):
        """Perform monitoring tasks"""
        try:
            last_check = datetime.now() - timedelta(minutes=5)
            new_records = await self.sql_connector.monitor_new_records('user_events', last_check)
            
            if new_records:
                logging.info(f"Found {len(new_records)} new records")
                
                for record in new_records:
                    await self.process_record(record)
                    
        except Exception as e:
            logging.error(f"Monitoring failed: {e}")
    
    async def perform_maintenance(self):
        """Perform maintenance tasks"""
        try:
            logging.info("Running maintenance tasks...")
            rows_cleaned = await self.sql_connector.run_maintenance_task()
            logging.info(f"Maintenance completed. Cleaned {rows_cleaned} records.")
            
        except Exception as e:
            logging.error(f"Maintenance failed: {e}")
    
    async def process_record(self, record):
        """Process individual record"""
        logging.info(f"Processing record: {record.get('id', 'unknown')}")
        
        # Example processing logic:
        # - Send email notifications
        # - Update external APIs
        # - Generate reports
        # - Sync with other databases
        # - Trigger Azure Functions
        
        # Example: Check record type and take action
        if record.get('event_type') == 'user_signup':
            await self.handle_user_signup(record)
        elif record.get('event_type') == 'payment_completed':
            await self.handle_payment_completed(record)
    
    async def handle_user_signup(self, record):
        """Handle new user signup event"""
        logging.info(f"Processing user signup: {record.get('user_id')}")
        # Could trigger welcome email, setup user profile, etc.
    
    async def handle_payment_completed(self, record):
        """Handle payment completion event"""
        logging.info(f"Processing payment: {record.get('payment_id')}")
        # Could trigger invoice generation, upgrade user account, etc.
    
    async def stop(self):
        """Stop the agent"""
        self.running = False
        await self.sql_connector.disconnect()
        logging.info("SaaS Agent stopped")

# Example usage
async def main():
    agent = SaaSAgent()
    
    try:
        await agent.start()
    except KeyboardInterrupt:
        logging.info("Received shutdown signal")
        await agent.stop()

if __name__ == "__main__":
    asyncio.run(main())
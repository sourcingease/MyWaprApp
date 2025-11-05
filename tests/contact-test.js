/**
 * Contact Test Page
 * Interactive test for adding names to the contactTest table
 */

require('dotenv').config();
const { AzureSQLConnector } = require('../src/index.js');
const readline = require('readline');

class ContactTestPage {
  constructor() {
    this.sqlConnector = new AzureSQLConnector();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🎯 Contact Test Page');
    console.log('This will connect to your contactTest table and allow you to add names.\n');

    try {
      // Connect to database
      console.log('🔌 Connecting to database...');
      await this.sqlConnector.connect();
      console.log('✅ Connected successfully!\n');

      // Check if contactTest table exists
      await this.checkTable();

      // Start interactive menu
      await this.showMenu();

    } catch (error) {
      console.error('❌ Error:', error.message);
      
      if (error.message.includes('AZURE_SQL_PASSWORD')) {
        console.log('\n💡 Please set your password in the .env file');
      }
      
      process.exit(1);
    }
  }

  async checkTable() {
    try {
      console.log('🔍 Checking contactTest table...');
      
      // Check if table exists and get structure
      const result = await this.sqlConnector.executeQuery(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'contactTest'
        ORDER BY ORDINAL_POSITION
      `);

      if (result.recordset.length === 0) {
        console.log('⚠️  Table contactTest not found. Creating it...');
        await this.createTable();
      } else {
        console.log('✅ Table contactTest found with columns:');
        result.recordset.forEach(col => {
          console.log(`   📋 ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });
      }

      // Show existing records count
      const countResult = await this.sqlConnector.executeQuery('SELECT COUNT(*) as total FROM contactTest');
      console.log(`📊 Current records in table: ${countResult.recordset[0].total}\n`);

    } catch (error) {
      if (error.message.includes('Invalid object name')) {
        console.log('⚠️  Table contactTest not found. Creating it...');
        await this.createTable();
      } else {
        throw error;
      }
    }
  }

  async createTable() {
    try {
      await this.sqlConnector.executeQuery(`
        CREATE TABLE contactTest (
          Id int IDENTITY(1,1) PRIMARY KEY,
          Name nvarchar(255) NOT NULL,
          CreatedDate datetime2 DEFAULT GETDATE()
        )
      `);
      console.log('✅ Table contactTest created successfully!\n');
    } catch (error) {
      console.error('❌ Failed to create table:', error.message);
      throw error;
    }
  }

  async showMenu() {
    console.log('📋 Available actions:');
    console.log('1. Add a new contact');
    console.log('2. View all contacts');
    console.log('3. View recent contacts (last 10)');
    console.log('4. Delete all contacts');
    console.log('5. Exit\n');

    const choice = await this.askQuestion('Choose an option (1-5): ');

    switch (choice.trim()) {
      case '1':
        await this.addContact();
        break;
      case '2':
        await this.viewAllContacts();
        break;
      case '3':
        await this.viewRecentContacts();
        break;
      case '4':
        await this.deleteAllContacts();
        break;
      case '5':
        await this.exit();
        return;
      default:
        console.log('❌ Invalid option. Please choose 1-5.\n');
        await this.showMenu();
    }

    // Show menu again unless exiting
    setTimeout(() => this.showMenu(), 1000);
  }

  async addContact() {
    try {
      console.log('\n➕ Adding new contact');
      const name = await this.askQuestion('Enter name: ');

      if (!name.trim()) {
        console.log('❌ Name cannot be empty!\n');
        return;
      }

      // Insert into database with proper SQL escaping
      const cleanName = name.trim().replace(/'/g, "''"); // Escape single quotes
      const insertQuery = `INSERT INTO contactTest (Name) VALUES ('${cleanName}')`;
      await this.sqlConnector.executeQuery(insertQuery);

      console.log(`✅ Contact "${name.trim()}" added successfully!\n`);

      // Show updated count
      const countResult = await this.sqlConnector.executeQuery('SELECT COUNT(*) as total FROM contactTest');
      console.log(`📊 Total contacts: ${countResult.recordset[0].total}\n`);

    } catch (error) {
      console.error('❌ Failed to add contact:', error.message);
    }
  }

  async viewAllContacts() {
    try {
      console.log('\n👥 All Contacts:');
      const result = await this.sqlConnector.executeQuery(`
        SELECT Id, Name, CreatedDate 
        FROM contactTest 
        ORDER BY CreatedDate DESC
      `);

      if (result.recordset.length === 0) {
        console.log('📭 No contacts found.\n');
        return;
      }

      console.log('─'.repeat(60));
      console.log('ID'.padEnd(5) + 'NAME'.padEnd(30) + 'CREATED');
      console.log('─'.repeat(60));

      result.recordset.forEach(contact => {
        const date = new Date(contact.CreatedDate).toLocaleString();
        console.log(
          contact.Id.toString().padEnd(5) + 
          contact.Name.padEnd(30) + 
          date
        );
      });

      console.log('─'.repeat(60));
      console.log(`Total: ${result.recordset.length} contacts\n`);

    } catch (error) {
      console.error('❌ Failed to view contacts:', error.message);
    }
  }

  async viewRecentContacts() {
    try {
      console.log('\n🕐 Recent Contacts (Last 10):');
      const result = await this.sqlConnector.executeQuery(`
        SELECT TOP 10 Id, Name, CreatedDate 
        FROM contactTest 
        ORDER BY CreatedDate DESC
      `);

      if (result.recordset.length === 0) {
        console.log('📭 No contacts found.\n');
        return;
      }

      result.recordset.forEach((contact, index) => {
        const date = new Date(contact.CreatedDate).toLocaleString();
        console.log(`${index + 1}. ${contact.Name} (ID: ${contact.Id}) - ${date}`);
      });
      console.log('');

    } catch (error) {
      console.error('❌ Failed to view recent contacts:', error.message);
    }
  }

  async deleteAllContacts() {
    try {
      const confirm = await this.askQuestion('\n⚠️  Are you sure you want to delete ALL contacts? (yes/no): ');
      
      if (confirm.toLowerCase() !== 'yes') {
        console.log('❌ Deletion cancelled.\n');
        return;
      }

      const result = await this.sqlConnector.executeQuery('DELETE FROM contactTest');
      console.log(`✅ Deleted ${result.rowsAffected} contacts.\n`);

    } catch (error) {
      console.error('❌ Failed to delete contacts:', error.message);
    }
  }

  async exit() {
    console.log('\n👋 Goodbye!');
    await this.sqlConnector.disconnect();
    this.rl.close();
    process.exit(0);
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Start the test page
const testPage = new ContactTestPage();
testPage.start().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
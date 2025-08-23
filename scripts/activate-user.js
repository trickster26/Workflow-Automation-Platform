const mysql = require('mysql2/promise');

async function activateUser() {
  try {
    // Create connection to database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'workflow_automation'
    });

    // Update user to be active
    const [result] = await connection.execute(
      'UPDATE users SET isActive = true WHERE email = ?',
      ['anu@yopmail.com']
    );
    
    console.log('User activation result:', result);
    
    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id, email, username, isActive, role FROM users WHERE email = ? OR username = ?',
      ['anu@yopmail.com', 'akk1']
    );
    
    console.log('All users with this email/username:', rows);
    
    await connection.end();
    console.log('User activated successfully!');
  } catch (error) {
    console.error('Error activating user:', error);
  }
}

activateUser();
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query, connectDB } = require('../src/config/db');

const createAdmin = async () => {
  await connectDB();

  const hash = await bcrypt.hash('NYXON_Admin@2026!', 12);

  await query(`
    INSERT INTO users (nom, prenom, email, password_hash, role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `, ['Admin', 'Super', 'admin@boutique.com', hash, 'superadmin']);

  console.log('✅ Admin créé/mis à jour');
  process.exit(0);
};

createAdmin().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
import { getDB } from '../_lib/db.js';
import { PasswordEntry } from '../_lib/models.js';
import { authMiddleware } from '../_lib/auth.js';
import { handleCors } from '../_lib/utils.js';

async function handler(req, res) {
  const db = await getDB();
  const userId = req.user.user_id;

  try {
    if (req.method === 'GET') {
      // Recupera password con id incluso (campo UUID, non _id MongoDB)
      const passwords = await db.collection('password_entries')
        .find({ user_id: userId }, { projection: { _id: 0 } })
        .toArray();
      
      // Assicurati che tutti abbiano un id valido
      const passwordsWithId = passwords.map(pwd => {
        if (!pwd.id) {
          console.warn('Password without id found, this should not happen');
        }
        return pwd;
      });
      
      return res.status(200).json(passwordsWithId);
    }

    if (req.method === 'POST') {
      const passwordData = req.body;
      const passwordEntry = new PasswordEntry({
        ...passwordData,
        user_id: userId
      });
      await db.collection('password_entries').insertOne(passwordEntry.toJSON());
      return res.status(200).json(passwordEntry.toJSON());
    }

    return res.status(405).json({ detail: 'Method not allowed' });
  } catch (error) {
    console.error('Passwords error:', error);
    return res.status(500).json({ detail: error.message });
  }
}

export default handleCors(authMiddleware(handler));
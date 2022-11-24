const mongoose = require('mongoose');

class Database {
  async connect() {
    try {
      await mongoose.connect(process.env.DB_URL, { autoIndex: true });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

module.exports = new Database();

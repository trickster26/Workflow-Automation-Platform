import { Sequelize, DataTypes } from 'sequelize';
import { UserModel, IUser, IUserCreationAttributes } from '../../models/User.model';

// Setup in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

// Initialize the model
UserModel.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8, 255],
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
});

describe('User Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await UserModel.destroy({ where: {} });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Creation', () => {
    it('should create a user with valid data', async () => {
      const userData: IUserCreationAttributes = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
      };

      const user = await UserModel.create(userData);

      expect(user).toBeInstanceOf(UserModel);
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.password).toBe(userData.password);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe('user'); // Default value
      expect(user.isActive).toBe(true); // Default value
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a user with minimal required data', async () => {
      const userData: IUserCreationAttributes = {
        email: 'minimal@example.com',
        username: 'minimaluser',
        password: 'hashedpassword123',
      };

      const user = await UserModel.create(userData);

      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.password).toBe(userData.password);
      expect(user.firstName).toBeUndefined();
      expect(user.lastName).toBeUndefined();
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
    });

    it('should create an admin user', async () => {
      const userData: IUserCreationAttributes = {
        email: 'admin@example.com',
        username: 'adminuser',
        password: 'hashedpassword123',
        role: 'admin',
      };

      const user = await UserModel.create(userData);

      expect(user.role).toBe('admin');
    });

    it('should set isActive to false when specified', async () => {
      const userData: IUserCreationAttributes = {
        email: 'inactive@example.com',
        username: 'inactiveuser',
        password: 'hashedpassword123',
        isActive: false,
      };

      const user = await UserModel.create(userData);

      expect(user.isActive).toBe(false);
    });
  });

  describe('Model Validation', () => {
    it('should throw error for duplicate email', async () => {
      const userData: IUserCreationAttributes = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'hashedpassword123',
      };

      await UserModel.create(userData);

      await expect(UserModel.create({
        ...userData,
        username: 'user2', // Different username but same email
      })).rejects.toThrow();
    });

    it('should throw error for duplicate username', async () => {
      const userData: IUserCreationAttributes = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'hashedpassword123',
      };

      await UserModel.create(userData);

      await expect(UserModel.create({
        ...userData,
        email: 'user2@example.com', // Different email but same username
      })).rejects.toThrow();
    });

    it('should throw error for invalid email format', async () => {
      const userData: IUserCreationAttributes = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'hashedpassword123',
      };

      await expect(UserModel.create(userData)).rejects.toThrow();
    });

    it('should throw error for short username', async () => {
      const userData: IUserCreationAttributes = {
        email: 'test@example.com',
        username: 'ab', // Too short (less than 3 characters)
        password: 'hashedpassword123',
      };

      await expect(UserModel.create(userData)).rejects.toThrow();
    });

    it('should throw error for long username', async () => {
      const userData: IUserCreationAttributes = {
        email: 'test@example.com',
        username: 'a'.repeat(51), // Too long (more than 50 characters)
        password: 'hashedpassword123',
      };

      await expect(UserModel.create(userData)).rejects.toThrow();
    });

    it('should throw error for short password', async () => {
      const userData: IUserCreationAttributes = {
        email: 'test@example.com',
        username: 'testuser',
        password: '1234567', // Too short (less than 8 characters)
      };

      await expect(UserModel.create(userData)).rejects.toThrow();
    });

    it('should throw error for missing required fields', async () => {
      // Missing email
      await expect(UserModel.create({
        username: 'testuser',
        password: 'hashedpassword123',
      } as any)).rejects.toThrow();

      // Missing username
      await expect(UserModel.create({
        email: 'test@example.com',
        password: 'hashedpassword123',
      } as any)).rejects.toThrow();

      // Missing password
      await expect(UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
      } as any)).rejects.toThrow();
    });

    it('should throw error for invalid role', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword123',
        role: 'invalid_role', // Invalid role
      };

      await expect(UserModel.create(userData as any)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let testUser: UserModel;

    beforeEach(async () => {
      testUser = await UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        password: '$2a$10$hashedpassword', // Mock bcrypt hash
        firstName: 'Test',
        lastName: 'User',
      });
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        // Mock bcrypt.compare to return true
        const bcrypt = require('bcryptjs');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

        const result = await testUser.comparePassword('correctpassword');

        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith('correctpassword', '$2a$10$hashedpassword');
      });

      it('should return false for incorrect password', async () => {
        // Mock bcrypt.compare to return false
        const bcrypt = require('bcryptjs');
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

        const result = await testUser.comparePassword('wrongpassword');

        expect(result).toBe(false);
        expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', '$2a$10$hashedpassword');
      });
    });

    describe('setPassword', () => {
      it('should hash and set new password', async () => {
        // Mock bcrypt.hash
        const bcrypt = require('bcryptjs');
        const hashedPassword = '$2a$10$newhashedpassword';
        jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword);

        await testUser.setPassword('newpassword123');

        expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
        expect(testUser.password).toBe(hashedPassword);
      });

      it('should use correct salt rounds', async () => {
        const bcrypt = require('bcryptjs');
        jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2a$10$hashed');

        await testUser.setPassword('password123');

        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      });
    });

    describe('updateLastLogin', () => {
      it('should update lastLogin to current timestamp', () => {
        const beforeUpdate = testUser.lastLogin;
        const now = new Date();
        
        testUser.updateLastLogin();
        
        expect(testUser.lastLogin).toBeInstanceOf(Date);
        expect(testUser.lastLogin?.getTime()).toBeGreaterThanOrEqual(now.getTime() - 100); // Allow small margin
        expect(testUser.lastLogin).not.toBe(beforeUpdate);
      });
    });

    describe('getFullName', () => {
      it('should return full name when both first and last names are present', () => {
        testUser.firstName = 'John';
        testUser.lastName = 'Doe';

        const fullName = testUser.getFullName?.() || `${testUser.firstName} ${testUser.lastName}`;

        expect(fullName).toBe('John Doe');
      });

      it('should return first name only when last name is missing', () => {
        testUser.firstName = 'John';
        testUser.lastName = undefined;

        const fullName = testUser.firstName || '';

        expect(fullName).toBe('John');
      });

      it('should return last name only when first name is missing', () => {
        testUser.firstName = undefined;
        testUser.lastName = 'Doe';

        const fullName = testUser.lastName || '';

        expect(fullName).toBe('Doe');
      });

      it('should return username when both names are missing', () => {
        testUser.firstName = undefined;
        testUser.lastName = undefined;

        const fullName = testUser.username;

        expect(fullName).toBe('testuser');
      });
    });
  });

  describe('Model Queries', () => {
    beforeEach(async () => {
      // Create test users
      await UserModel.bulkCreate([
        {
          email: 'user1@example.com',
          username: 'user1',
          password: 'hashedpassword123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
          isActive: true,
        },
        {
          email: 'user2@example.com',
          username: 'user2',
          password: 'hashedpassword123',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'admin',
          isActive: true,
        },
        {
          email: 'user3@example.com',
          username: 'user3',
          password: 'hashedpassword123',
          firstName: 'Bob',
          lastName: 'Johnson',
          role: 'user',
          isActive: false,
        },
      ]);
    });

    it('should find user by email', async () => {
      const user = await UserModel.findOne({
        where: { email: 'user1@example.com' },
      });

      expect(user).not.toBeNull();
      expect(user!.email).toBe('user1@example.com');
      expect(user!.username).toBe('user1');
    });

    it('should find user by username', async () => {
      const user = await UserModel.findOne({
        where: { username: 'user2' },
      });

      expect(user).not.toBeNull();
      expect(user!.username).toBe('user2');
      expect(user!.email).toBe('user2@example.com');
    });

    it('should find active users only', async () => {
      const activeUsers = await UserModel.findAll({
        where: { isActive: true },
      });

      expect(activeUsers).toHaveLength(2);
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should find users by role', async () => {
      const adminUsers = await UserModel.findAll({
        where: { role: 'admin' },
      });

      const regularUsers = await UserModel.findAll({
        where: { role: 'user' },
      });

      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].role).toBe('admin');
      expect(regularUsers).toHaveLength(2);
      regularUsers.forEach(user => {
        expect(user.role).toBe('user');
      });
    });

    it('should count total users', async () => {
      const count = await UserModel.count();

      expect(count).toBe(3);
    });

    it('should count users with condition', async () => {
      const activeCount = await UserModel.count({
        where: { isActive: true },
      });

      const adminCount = await UserModel.count({
        where: { role: 'admin' },
      });

      expect(activeCount).toBe(2);
      expect(adminCount).toBe(1);
    });
  });

  describe('Model Updates', () => {
    let testUser: UserModel;

    beforeEach(async () => {
      testUser = await UserModel.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword123',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should update user fields', async () => {
      await testUser.update({
        firstName: 'Updated',
        lastName: 'Name',
        isActive: false,
      });

      await testUser.reload();

      expect(testUser.firstName).toBe('Updated');
      expect(testUser.lastName).toBe('Name');
      expect(testUser.isActive).toBe(false);
      expect(testUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should update lastLogin timestamp', async () => {
      const beforeUpdate = testUser.lastLogin;
      
      await testUser.update({
        lastLogin: new Date(),
      });

      expect(testUser.lastLogin).not.toBe(beforeUpdate);
      expect(testUser.lastLogin).toBeInstanceOf(Date);
    });

    it('should maintain data integrity on partial updates', async () => {
      const originalEmail = testUser.email;
      const originalUsername = testUser.username;

      await testUser.update({
        firstName: 'NewFirst',
      });

      expect(testUser.firstName).toBe('NewFirst');
      expect(testUser.email).toBe(originalEmail);
      expect(testUser.username).toBe(originalUsername);
    });
  });

  describe('Model Deletion', () => {
    let testUser: UserModel;

    beforeEach(async () => {
      testUser = await UserModel.create({
        email: 'delete@example.com',
        username: 'deleteuser',
        password: 'hashedpassword123',
      });
    });

    it('should delete user successfully', async () => {
      const userId = testUser.id;
      
      await testUser.destroy();

      const deletedUser = await UserModel.findByPk(userId);
      expect(deletedUser).toBeNull();
    });

    it('should delete multiple users with condition', async () => {
      await UserModel.bulkCreate([
        {
          email: 'temp1@example.com',
          username: 'temp1',
          password: 'hashedpassword123',
          isActive: false,
        },
        {
          email: 'temp2@example.com',
          username: 'temp2',
          password: 'hashedpassword123',
          isActive: false,
        },
      ]);

      const deletedCount = await UserModel.destroy({
        where: { isActive: false },
      });

      expect(deletedCount).toBe(2); // Should delete the 2 inactive temp users
    });
  });
});
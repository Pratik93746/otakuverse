const User = require('../models/User');
const { getPagination, formatPagination } = require('../utils/pagination');
const env = require('../config/env');

class UserService {
  /**
   * Sync or upsert user profile based on verified Firebase auth identity
   */
  async syncUser(firebaseUser) {
    const { uid, email, name, picture, decodedToken } = firebaseUser;
    const cleanEmail = (email || '').toLowerCase().trim();
    const isEmailVerified = decodedToken ? !!decodedToken.email_verified : false;

    // Check if approved admin email — STRICTLY requires verified email
    const isAdmin = isEmailVerified && cleanEmail && Array.isArray(env.ADMIN_EMAILS) && env.ADMIN_EMAILS.includes(cleanEmail);

    // Look up by authProviderId first (primary secure identity)
    let user = await User.findOne({ authProviderId: uid });

    // Fallback: If not found by UID, only match by email if email is cryptographically verified
    if (!user && cleanEmail && isEmailVerified) {
      user = await User.findOne({ email: cleanEmail });
      if (user && !user.authProviderId) {
        user.authProviderId = uid;
      }
    }

    if (user) {
      if (isAdmin && user.role !== 'ADMIN') user.role = 'ADMIN';
      if (name && !user.name) user.name = name;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
      return user.toObject();
    }

    user = new User({
      authProviderId: uid,
      email: cleanEmail || `${uid}@anonymous.otakuverse.in`,
      name: name || (cleanEmail ? cleanEmail.split('@')[0] : 'Hunter'),
      avatar: picture || '',
      role: isAdmin ? 'ADMIN' : 'USER',
      addresses: [],
      isActive: true,
    });

    await user.save();
    return user.toObject();
  }

  /**
   * Retrieve user profile by authProviderId
   */
  async getProfile(authProviderId) {
    return await User.findOne({ authProviderId }).lean();
  }

  /**
   * Update user profile
   */
  async updateProfile(authProviderId, updateData) {
    const allowedUpdates = {};
    if (updateData.name) allowedUpdates.name = updateData.name.trim();
    if (updateData.phone !== undefined) allowedUpdates.phone = updateData.phone.trim();
    if (updateData.avatar) allowedUpdates.avatar = updateData.avatar.trim();

    return await User.findOneAndUpdate(
      { authProviderId },
      { $set: allowedUpdates },
      { new: true }
    ).lean();
  }

  /**
   * Add or update delivery address
   */
  async addAddress(authProviderId, addressData) {
    const user = await User.findOne({ authProviderId });
    if (!user) throw new Error('User not found.');

    if (addressData.isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    user.addresses.push(addressData);
    await user.save();
    return user.addresses;
  }

  /**
   * Retrieve paginated users for Admin (Section 29)
   */
  async getAllUsersAdmin(queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 20, 50);

    const filter = {};
    if (queryParams.role) filter.role = queryParams.role;
    if (queryParams.search) {
      const s = queryParams.search.trim();
      filter.$or = [
        { email: { $regex: s, $options: 'i' } },
        { name: { $regex: s, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Update user role (Admin)
   */
  async updateUserRole(userId, role) {
    return await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).lean();
  }

  /**
   * Deactivate user (Admin)
   */
  async deactivateUser(userId) {
    return await User.findByIdAndUpdate(userId, { $set: { isActive: false } }, { new: true }).lean();
  }
}

module.exports = new UserService();

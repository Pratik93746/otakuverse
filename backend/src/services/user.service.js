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
    if (typeof updateData.name === 'string' && updateData.name.trim()) allowedUpdates.name = updateData.name.trim().slice(0, 100);
    if (typeof updateData.phone === 'string') allowedUpdates.phone = updateData.phone.trim().slice(0, 20);
    if (typeof updateData.avatar === 'string' && /^https?:\/\//i.test(updateData.avatar.trim())) {
      allowedUpdates.avatar = updateData.avatar.trim().slice(0, 1000);
    }
    if (Object.keys(allowedUpdates).length === 0) return await User.findOne({ authProviderId }).lean();

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

    if (user.addresses.length >= 15) {
      throw Object.assign(new Error('Maximum 15 saved addresses allowed. Please remove an old one.'), { statusCode: 400, code: 'ADDRESS_LIMIT' });
    }

    // Copy only known fields: the request body is never pushed into the document as-is.
    const t = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const clean = {
      fullName: t(addressData.fullName, 100),
      phone: t(addressData.phone, 20),
      addressLine1: t(addressData.addressLine1, 200),
      addressLine2: t(addressData.addressLine2, 200),
      city: t(addressData.city, 100),
      state: t(addressData.state, 100),
      pinCode: t(addressData.pinCode, 10).replace(/\D/g, ''),
      country: t(addressData.country, 60) || 'India',
      isDefault: addressData.isDefault === true,
    };

    if (clean.isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    user.addresses.push(clean);
    await user.save();
    return user.addresses;
  }

  /**
   * Retrieve paginated users for Admin (Section 29)
   */
  async getAllUsersAdmin(queryParams) {
    const { page, limit, skip } = getPagination(queryParams, 20, 50);

    const filter = {};
    if (typeof queryParams.role === 'string' && ['USER', 'ADMIN'].includes(queryParams.role.toUpperCase())) {
      filter.role = queryParams.role.toUpperCase();
    }
    if (typeof queryParams.search === 'string' && queryParams.search.trim()) {
      const s = queryParams.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (typeof role !== 'string' || !['USER', 'ADMIN'].includes(role.toUpperCase())) {
      const err = new Error('Invalid user role');
      err.statusCode = 400;
      throw err;
    }
    if (!require('mongoose').Types.ObjectId.isValid(userId)) {
      const err = new Error('Invalid user id');
      err.statusCode = 400;
      throw err;
    }
    return await User.findByIdAndUpdate(userId, { $set: { role: role.toUpperCase() } }, { new: true, runValidators: true }).lean();
  }

  /**
   * Deactivate user (Admin)
   */
  async deactivateUser(userId) {
    return await User.findByIdAndUpdate(userId, { $set: { isActive: false } }, { new: true }).lean();
  }
}

module.exports = new UserService();

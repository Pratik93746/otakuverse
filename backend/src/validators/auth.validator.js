const validateProfileUpdate = (req) => {
  const { name, phone, avatar } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 100)) {
    return 'Name must be a non-empty string up to 100 characters.';
  }
  if (phone !== undefined && (typeof phone !== 'string' || phone.length > 20)) {
    return 'Phone must be a valid string up to 20 characters.';
  }
  if (avatar !== undefined && (typeof avatar !== 'string' || avatar.length > 1000 || (avatar && !/^https?:\/\//i.test(avatar)))) {
    return 'Avatar must be a valid http(s) URL.';
  }
  return null;
};

const validateAddress = (req) => {
  const { fullName, phone, addressLine1, city, state, pinCode } = req.body;
  for (const v of [fullName, phone, addressLine1, req.body.addressLine2, city, state, pinCode, req.body.country]) {
    if (v !== undefined && (typeof v !== 'string' || v.length > 200)) return 'Address fields must be text of reasonable length.';
  }
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) return 'Full name is required.';
  if (!phone || typeof phone !== 'string' || !phone.trim()) return 'Phone is required.';
  if (!addressLine1 || typeof addressLine1 !== 'string' || addressLine1.trim().length < 5) {
    return 'Address Line 1 must be at least 5 characters.';
  }
  if (!city || typeof city !== 'string' || !city.trim()) return 'City is required.';
  if (!state || typeof state !== 'string' || !state.trim()) return 'State is required.';
  const pin = (pinCode || '').trim().replace(/\D/g, '');
  if (!/^[1-9]\d{5}$/.test(pin)) return 'Valid 6-digit Indian PIN code is required.';
  return null;
};

module.exports = {
  validateProfileUpdate,
  validateAddress,
};

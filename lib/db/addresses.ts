import { getCollection, ensureIndexes } from '@/lib/mongodb';
import { DbAddress } from './types';
import { ObjectId } from 'mongodb';

export async function getAddressesCollection() {
  await ensureIndexes();
  return await getCollection<DbAddress>('addresses');
}

export async function getUserAddresses(firebaseUid: string): Promise<DbAddress[]> {
  if (!firebaseUid) return [];
  const col = await getAddressesCollection();
  return await col.find({ firebaseUid }).sort({ isDefault: -1, createdAt: -1 }).toArray();
}

export async function saveAddress(
  firebaseUid: string,
  address: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country?: string;
    isDefault?: boolean;
  },
  addressId?: string
): Promise<DbAddress> {
  if (!firebaseUid) throw new Error('firebaseUid is required');
  const col = await getAddressesCollection();
  const now = new Date();

  if (address.isDefault) {
    // Unset other default addresses for this user
    await col.updateMany({ firebaseUid }, { $set: { isDefault: false } });
  }

  if (addressId) {
    if (!ObjectId.isValid(addressId)) {
      throw new Error('Invalid address ID');
    }
    const updateData: Partial<DbAddress> = {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pinCode: address.pinCode,
      country: address.country || 'India',
      isDefault: !!address.isDefault,
      updatedAt: now,
    };

    const updated = await col.findOneAndUpdate(
      { _id: new ObjectId(addressId) as any, firebaseUid },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (updated) return updated as DbAddress;
    throw new Error('Address not found or unauthorized');
  }

  const newAddress: DbAddress = {
    firebaseUid,
    fullName: address.fullName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    pinCode: address.pinCode,
    country: address.country || 'India',
    isDefault: !!address.isDefault,
    createdAt: now,
    updatedAt: now,
  };

  const res = await col.insertOne(newAddress as any);
  return { ...newAddress, _id: res.insertedId };
}

export async function deleteAddress(addressId: string, firebaseUid: string): Promise<boolean> {
  if (!addressId || !firebaseUid) return false;
  const col = await getAddressesCollection();

  if (!ObjectId.isValid(addressId)) return false;

  const res = await col.deleteOne({
    _id: new ObjectId(addressId) as any,
    firebaseUid,
  });

  return res.deletedCount > 0;
}

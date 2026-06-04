const RECORDS = 'poop_records';
const PROFILE = 'poop_profile';
const CACHE_RECORDS = 'poop:records:cache';
const CACHE_PROFILE = 'poop:profile:cache';

function db() {
  return wx.cloud.database();
}

// ---- 本地缓存 ----
function getCachedRecords() {
  return wx.getStorageSync(CACHE_RECORDS) || [];
}
function setCachedRecords(list) {
  wx.setStorageSync(CACHE_RECORDS, list);
}
function getCachedProfile() {
  return wx.getStorageSync(CACHE_PROFILE) || null;
}
function setCachedProfile(p) {
  wx.setStorageSync(CACHE_PROFILE, p);
}

// ---- 记录 ----
async function fetchRecords() {
  const res = await db().collection(RECORDS).orderBy('endAt', 'desc').limit(100).get();
  setCachedRecords(res.data);
  return res.data;
}

async function addRecord(rec) {
  const res = await db().collection(RECORDS).add({ data: rec });
  const saved = Object.assign({ _id: res._id }, rec);
  setCachedRecords([saved].concat(getCachedRecords()));
  return saved;
}

async function removeRecord(id) {
  await db().collection(RECORDS).doc(id).remove();
  const list = getCachedRecords().filter((r) => r._id !== id);
  setCachedRecords(list);
  return list;
}

// ---- 用户资料 ----
async function fetchProfile() {
  const res = await db().collection(PROFILE).limit(1).get();
  const profile = res.data[0] || null;
  if (profile) setCachedProfile(profile);
  return profile;
}

async function upsertProfile(patch) {
  const res = await db().collection(PROFILE).limit(1).get();
  const existing = res.data[0];
  if (existing) {
    await db().collection(PROFILE).doc(existing._id).update({ data: patch });
    const merged = Object.assign({}, existing, patch);
    setCachedProfile(merged);
    return merged;
  }
  const added = await db().collection(PROFILE).add({ data: patch });
  const merged = Object.assign({ _id: added._id }, patch);
  setCachedProfile(merged);
  return merged;
}

// ---- 头像上传云存储 ----
async function uploadAvatar(filePath) {
  const m = filePath.match(/\.(\w+)$/);
  const ext = m ? m[1] : 'jpg';
  const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const res = await wx.cloud.uploadFile({ cloudPath, filePath });
  return res.fileID;
}

// ---- 保存失败的本地 outbox（待重试）----
const FAILED = 'poop:failed';
function getFailedRecords() {
  return wx.getStorageSync(FAILED) || [];
}
function setFailedRecords(list) {
  wx.setStorageSync(FAILED, list);
}
function addFailed(rec) {
  const item = Object.assign(
    { _localId: `local_${Date.now()}_${Math.floor(Math.random() * 1000)}` },
    rec,
  );
  setFailedRecords([item].concat(getFailedRecords()));
  return item;
}
function removeFailed(localId) {
  const list = getFailedRecords().filter((f) => f._localId !== localId);
  setFailedRecords(list);
  return list;
}
// 重新把某条失败记录写入云端；成功后从 outbox 移除并进入正常缓存
async function retryFailed(localId) {
  const failed = getFailedRecords();
  const item = failed.find((f) => f._localId === localId);
  if (!item) return null;
  const rec = {
    startAt: item.startAt,
    endAt: item.endAt,
    duration: item.duration,
    feeling: item.feeling,
  };
  const res = await db().collection(RECORDS).add({ data: rec });
  setFailedRecords(failed.filter((f) => f._localId !== localId));
  const saved = Object.assign({ _id: res._id }, rec);
  setCachedRecords([saved].concat(getCachedRecords()));
  return saved;
}

module.exports = {
  getCachedRecords,
  setCachedRecords,
  getCachedProfile,
  setCachedProfile,
  fetchRecords,
  addRecord,
  removeRecord,
  fetchProfile,
  upsertProfile,
  uploadAvatar,
  getFailedRecords,
  addFailed,
  removeFailed,
  retryFailed,
};

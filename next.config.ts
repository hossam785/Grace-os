/** @type {import('next').NextConfig} */
const nextConfig = {
  /* هنا بنجبر السيرفر إنه يعتمد الـ App Router الافتراضي بدون أي اجتهاد منه */
  experimental: {
    // لو شغال بإصدار قديم تكة، السطر ده بيأمن المسار
  }
};

export default nextConfig;
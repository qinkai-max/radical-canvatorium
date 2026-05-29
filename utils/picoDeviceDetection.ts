/**
 * Pico 设备检测工具函数
 * 用于检测 Pico VR 设备的具体型号，并返回对应的 WebXR Input Profile 配置
 */

/**
 * 检测具体的 Pico 型号
 * @param userAgent - 浏览器的 UserAgent 字符串
 * @returns 返回对应的 Pico 配置文件名，如果不是 Pico 设备则返回 undefined
 */
export const detectPicoModel = (userAgent: string): string | undefined => {
  if (userAgent.includes("PICO 4 Pro")) return "pico-4";
  if (userAgent.includes("PICO 4")) return "pico-4";
  if (userAgent.includes("PICO 4U")) return "pico-4u";
  if (userAgent.includes("PICO G2")) return "pico-g2";
  if (userAgent.includes("PICO Neo2")) return "pico-neo2";
  if (userAgent.includes("PICO Neo3")) return "pico-neo3";
  if (userAgent.includes("PICO")) return "pico-4";  // 默认回退到 pico-4
  return undefined;
};

/**
 * 获取当前设备的 WebXR Input Profile
 * @returns 返回当前设备应该使用的 WebXR Input Profile 配置
 */
export const getDeviceInputProfile = (): string | undefined => {
  if (typeof navigator === "undefined") return undefined;
  return detectPicoModel(navigator.userAgent);
};

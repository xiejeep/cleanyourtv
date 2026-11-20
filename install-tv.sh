#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APK_PATH="${APK_PATH:-${SCRIPT_DIR}/CleanYourTV.apk}"
PKG="com.gathin.tvhome"
HOME_ACTIVITY="${PKG}/.MainActivity"
HOME_SERVICE="${PKG}/${PKG}.HomeKeyService"

find_adb() {
  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return 0
  fi
  local candidates=(
    "${ANDROID_HOME:-}/platform-tools/adb"
    "${ANDROID_SDK_ROOT:-}/platform-tools/adb"
    "/home/ubuntu/Desktop/work/picture-book/flutter/.android-sdk/platform-tools/adb"
    "/usr/lib/android-sdk/platform-tools/adb"
  )
  for c in "${candidates[@]}"; do
    if [[ -n "${c}" && -x "${c}" ]]; then
      echo "${c}"
      return 0
    fi
  done
  return 1
}

ADB="$(find_adb || true)"
if [[ -z "${ADB}" ]]; then
  echo "错误：未找到 adb，请先安装或配置 ANDROID_HOME。" >&2
  exit 1
fi

if [[ ! -f "${APK_PATH}" ]]; then
  echo "错误：未找到安装包 ${APK_PATH}" >&2
  exit 1
fi

TARGET="${1:-}"
if [[ -z "${TARGET}" ]]; then
  read -r -p "请输入电视 IP 地址（例如 192.168.6.249 或 192.168.6.249:5555）: " TARGET
fi
if [[ -z "${TARGET}" ]]; then
  echo "错误：未提供电视地址或设备序列号。" >&2
  exit 1
fi

# 如果是纯 IP（不含冒号），默认补充 :5555 并执行 adb connect
if [[ "${TARGET}" != *:* && "${TARGET}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  TARGET="${TARGET}:5555"
fi

if [[ "${TARGET}" == *:* ]]; then
  echo ">>> 正在连接 ${TARGET} ..."
  "${ADB}" connect "${TARGET}" || true
fi

# 检查授权状态
for attempt in 1 2; do
  STATE="$("${ADB}" -s "${TARGET}" get-state 2>&1 || true)"
  if [[ "${STATE}" == "device" ]]; then
    break
  fi
  if "${ADB}" devices | grep -F "${TARGET}" | grep -q "unauthorized"; then
    echo "请在电视屏幕上勾选「一律允许」并点击「允许调试」，完成后按回车继续..."
    read -r
    "${ADB}" connect "${TARGET}" >/dev/null 2>&1 || true
  else
    echo "错误：设备 ${TARGET} 当前不可用（状态: ${STATE}），请确认电视已开启网络 ADB 调试。" >&2
    exit 1
  fi
done

if [[ "$("${ADB}" -s "${TARGET}" get-state 2>/dev/null || true)" != "device" ]]; then
  echo "错误：设备 ${TARGET} 未就绪。" >&2
  exit 1
fi

echo ">>> 正在安装 ${APK_PATH} ..."
set +e
INSTALL_OUT="$("${ADB}" -s "${TARGET}" install -r "${APK_PATH}" 2>&1)"
INSTALL_RC=$?
set -e
echo "${INSTALL_OUT}"

if [[ ${INSTALL_RC} -ne 0 ]]; then
  if echo "${INSTALL_OUT}" | grep -q "INSTALL_FAILED_UPDATE_INCOMPATIBLE"; then
    echo ">>> 检测到旧版签名不一致，正在卸载旧版后重新安装..."
    "${ADB}" -s "${TARGET}" uninstall "${PKG}"
    "${ADB}" -s "${TARGET}" install "${APK_PATH}"
  else
    echo "错误：APK 安装失败。" >&2
    exit 1
  fi
fi

echo ">>> 正在授予屏幕时间管理与系统权限..."
"${ADB}" -s "${TARGET}" shell appops set "${PKG}" SYSTEM_ALERT_WINDOW allow 2>/dev/null || true
"${ADB}" -s "${TARGET}" shell appops set "${PKG}" GET_USAGE_STATS allow 2>/dev/null || true
"${ADB}" -s "${TARGET}" shell pm grant "${PKG}" android.permission.ACCESS_FINE_LOCATION 2>/dev/null || true
"${ADB}" -s "${TARGET}" shell pm grant "${PKG}" android.permission.WRITE_SECURE_SETTINGS 2>/dev/null || true
"${ADB}" -s "${TARGET}" shell appops set "${PKG}" APP_AUTO_START allow 2>/dev/null || true
"${ADB}" -s "${TARGET}" shell appops set "${PKG}" APP_ASSOC_START allow 2>/dev/null || true

echo ">>> 正在设置默认启动器..."
"${ADB}" -s "${TARGET}" shell cmd package set-home-activity "${HOME_ACTIVITY}" || true

echo ">>> 正在启用 HomeKeyService 无障碍服务..."
EXISTING="$("${ADB}" -s "${TARGET}" shell settings get secure enabled_accessibility_services 2>/dev/null | tr -d '\r')"
if [[ "${EXISTING}" == "null" ]]; then
  EXISTING=""
fi
case ":${EXISTING}:" in
  *":${HOME_SERVICE}:"*) NEW_SERVICES="${EXISTING}" ;;
  *) NEW_SERVICES="${EXISTING:+${EXISTING}:}${HOME_SERVICE}" ;;
esac
"${ADB}" -s "${TARGET}" shell settings put secure enabled_accessibility_services "${NEW_SERVICES}"
"${ADB}" -s "${TARGET}" shell settings put secure accessibility_enabled 1

echo ">>> 正在启动 CleanYourTV..."
"${ADB}" -s "${TARGET}" shell am start -n "${HOME_ACTIVITY}"

echo ""
echo "✅ 全部完成！已安装、授权并设为默认启动器。"
echo "   提示：部分品牌电视（如 TCL）如重启后直接进 HDMI，可在电视系统设置中将「开机模式/开机通道」改为「主页/桌面」。"

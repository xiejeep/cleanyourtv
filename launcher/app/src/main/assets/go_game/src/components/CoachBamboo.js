export function renderPandaSVG(mood = 'happy') {
  let eyes = '';
  let mouth = '';
  let extras = '';

  if (mood === 'happy') {
    eyes = `
      <path d="M27 42 Q31 37 35 42" fill="none" stroke="#FFF" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M45 42 Q49 37 53 42" fill="none" stroke="#FFF" stroke-width="2.8" stroke-linecap="round"/>
    `;
    mouth = `<path d="M35 52 Q40 58 45 52" fill="none" stroke="#2B2D42" stroke-width="2.6" stroke-linecap="round"/>`;
    extras = `<text x="63" y="25" font-size="12">✨</text>`;
  } else if (mood === 'smug') {
    eyes = `
      <circle cx="31" cy="41" r="3" fill="#FFF"/>
      <circle cx="32" cy="41" r="1.4" fill="#111"/>
      <circle cx="49" cy="41" r="3" fill="#FFF"/>
      <circle cx="50" cy="41" r="1.4" fill="#111"/>
      <path d="M26 35 L35 37" stroke="#2B2D42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M54 35 L45 37" stroke="#2B2D42" stroke-width="2.2" stroke-linecap="round"/>
    `;
    mouth = `<path d="M36 53 Q42 56 47 50" fill="none" stroke="#2B2D42" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (mood === 'shocked') {
    eyes = `
      <circle cx="31" cy="41" r="4.2" fill="#FFF"/>
      <circle cx="31" cy="41" r="1.6" fill="#111"/>
      <circle cx="49" cy="41" r="4.2" fill="#FFF"/>
      <circle cx="49" cy="41" r="1.6" fill="#111"/>
    `;
    mouth = `<ellipse cx="40" cy="54" rx="4" ry="4.8" fill="#FF6B6B" stroke="#2B2D42" stroke-width="2"/>`;
    extras = `<text x="64" y="24" font-size="13">❗</text>`;
  } else if (mood === 'thinking') {
    eyes = `
      <circle cx="31" cy="41" r="3.2" fill="#FFF"/>
      <circle cx="32.4" cy="39.8" r="1.5" fill="#111"/>
      <circle cx="49" cy="41" r="3.2" fill="#FFF"/>
      <circle cx="50.4" cy="39.8" r="1.5" fill="#111"/>
    `;
    mouth = `<line x1="36" y1="53" x2="44" y2="53" stroke="#2B2D42" stroke-width="2.5" stroke-linecap="round"/>`;
    extras = `<circle cx="65" cy="24" r="2.2" fill="#1CB0F6"/><circle cx="70" cy="18" r="3" fill="#1CB0F6"/>`;
  } else if (mood === 'nervous') {
    eyes = `
      <path d="M27 39 L34 42 L27 44" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M53 39 L46 42 L53 44" fill="none" stroke="#FFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    mouth = `<path d="M34 54 Q37 51 40 54 Q43 57 46 54" fill="none" stroke="#2B2D42" stroke-width="2.4" stroke-linecap="round"/>`;
    extras = `<path d="M62 31 Q66 37 62 41 Q58 37 62 31 Z" fill="#38BDF8"/>`;
  } else {
    // crying
    eyes = `
      <path d="M27 39 L34 44 M34 39 L27 44" stroke="#FFF" stroke-width="2.3" stroke-linecap="round"/>
      <path d="M46 39 L53 44 M53 39 L46 44" stroke="#FFF" stroke-width="2.3" stroke-linecap="round"/>
    `;
    mouth = `<path d="M35 55 Q40 50 45 55" fill="none" stroke="#2B2D42" stroke-width="2.5" stroke-linecap="round"/>`;
    extras = `
      <path d="M28 47 Q26 54 29 56 Q32 54 30 47 Z" fill="#38BDF8"/>
      <path d="M50 47 Q48 54 51 56 Q54 54 52 47 Z" fill="#38BDF8"/>
    `;
  }

  return `
    <svg viewBox="0 0 80 80" class="w-full h-full" aria-label="小熊猫阿竹">
      <!-- Ears -->
      <circle cx="21" cy="22" r="10" fill="#2B2D42"/>
      <circle cx="59" cy="22" r="10" fill="#2B2D42"/>
      <circle cx="21" cy="22" r="4.5" fill="#4A4E69"/>
      <circle cx="59" cy="22" r="4.5" fill="#4A4E69"/>
      <!-- Bamboo sprout on head -->
      <path d="M40 16 Q40 7 47 6 Q46 13 40 16 Z" fill="#58CC02"/>
      <path d="M40 16 Q38 8 32 9 Q34 15 40 16 Z" fill="#78E028"/>
      <!-- Head -->
      <ellipse cx="40" cy="44" rx="26" ry="23" fill="#FFFDF8" stroke="#2B2D42" stroke-width="2.5"/>
      <!-- Eye patches -->
      <ellipse cx="30" cy="41" rx="8.5" ry="7" transform="rotate(-14 30 41)" fill="#2B2D42"/>
      <ellipse cx="50" cy="41" rx="8.5" ry="7" transform="rotate(14 50 41)" fill="#2B2D42"/>
      <!-- Cheeks -->
      <ellipse cx="22" cy="49" rx="4.2" ry="2.6" fill="#FF9AA2" opacity="0.7"/>
      <ellipse cx="58" cy="49" rx="4.2" ry="2.6" fill="#FF9AA2" opacity="0.7"/>
      <!-- Nose -->
      <ellipse cx="40" cy="47" rx="3.4" ry="2.2" fill="#2B2D42"/>
      ${eyes}
      ${mouth}
      ${extras}
    </svg>
  `;
}

export function renderCoachBox({ mood = 'happy', text = '', tagText = '小熊猫阿竹', isAlert = false, bounce = false }) {
  return `
    <div class="coach-box">
      <div class="coach-avatar ${bounce ? 'react-bounce' : ''}" data-action="replay-tts" title="点我重听语音">
        ${renderPandaSVG(mood)}
      </div>
      <div class="coach-bubble">
        <div class="coach-tag ${isAlert ? 'alert' : ''}">
          <span>${tagText}</span>
        </div>
        <div class="coach-text">${escapeHtml(text)}</div>
      </div>
      <button class="tts-replay-btn" data-action="replay-tts" aria-label="语音播报" title="再听一遍">🔊</button>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

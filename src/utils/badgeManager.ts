// Utility to handle App Icon Badges on mobile (PWA / Launcher), dynamic favicon badges, document title, and system notifications

/**
 * Updates the app icon badge on the mobile launcher / desktop PWA using the Badging API,
 * updates the document title, and draws a badge onto the dynamic favicon.
 */
export async function updateAppBadge(unreadCount: number): Promise<void> {
  // 1. Native Web App Badging API (Supported by Android Chrome, Samsung Internet, Windows, macOS PWAs)
  try {
    if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
      if (unreadCount > 0) {
        await (navigator as any).setAppBadge(unreadCount);
      } else if ('clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (err) {
    // Badging API might throw or be restricted in certain iframe contexts
    console.debug('Badging API notice:', err);
  }

  // 2. Document title badge (e.g. "(2) NgolaTeste - Preparação...")
  try {
    const baseTitle = 'NgolaTeste - Preparação para Concursos Públicos';
    if (unreadCount > 0) {
      document.title = `(${unreadCount > 9 ? '9+' : unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  } catch (_) {}

  // 3. Dynamic Favicon badge with red indicator
  try {
    updateFaviconWithBadge(unreadCount);
  } catch (_) {}
}

/**
 * Renders a dynamically badged favicon using an HTML5 canvas.
 */
function updateFaviconWithBadge(unreadCount: number): void {
  if (typeof document === 'undefined') return;

  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  if (unreadCount <= 0) {
    link.href = '/logo.svg';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = '/logo.svg';

  img.onload = () => {
    ctx.clearRect(0, 0, 64, 64);
    // Draw base icon
    ctx.drawImage(img, 0, 0, 64, 64);

    // Draw notification badge circle (top right)
    const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);
    const radius = 18;
    const centerX = 44;
    const centerY = 20;

    // White border shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Red badge background
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#dc2626'; // Tailwind red-600
    ctx.fill();

    // Text counter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, centerX, centerY + 1);

    if (link) {
      link.href = canvas.toDataURL('image/png');
    }
  };

  img.onerror = () => {
    // Fallback if logo fails to load: Draw standalone red dot
    ctx.clearRect(0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unreadCount > 9 ? '9+' : String(unreadCount), 32, 34);

    if (link) {
      link.href = canvas.toDataURL('image/png');
    }
  };
}

/**
 * Requests notification permissions from the user and sends a native system notification if granted.
 */
export async function sendNativeNotification(title: string, body: string, icon = '/official_logo.png'): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }

    if (perm === 'granted') {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: 'ngola-announcement',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    }
  } catch (e) {
    console.debug('Error dispatching native notification:', e);
  }
  return false;
}

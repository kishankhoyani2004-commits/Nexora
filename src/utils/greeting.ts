// Get current time in Kolkata (IST - UTC+5:30)
export function getKolkataTime(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
}

// Get time-based greeting (Good morning, afternoon, evening)
export function getTimeBasedGreeting(): string {
  const kolkataTime = getKolkataTime();
  const hour = kolkataTime.getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  } else if (hour >= 18 && hour < 23) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

// Get meaningful tagline based on user role
export function getPortalTagline(role: "client" | "freelancer"): string {
  const kolkataTime = getKolkataTime();
  const hour = kolkataTime.getHours();

  const clientTaglines = {
    morning: "Time to post jobs and find talented freelancers.",
    afternoon: "Keep your projects on track. Review proposals and manage your team.",
    evening: "Wrap up the day and check on your active projects.",
    night: "Rest well! Your projects are in good hands.",
  };

  const freelancerTaglines = {
    morning: "Start your day strong. Check for new opportunities matched to your skills.",
    afternoon: "Keep the momentum going. Apply to jobs and engage with clients.",
    evening: "Review your active projects and ensure delivery on track.",
    night: "Get ready for tomorrow. Plan your next moves.",
  };

  const getTimeOfDay = () => {
    if (hour >= 5 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 23) return "evening";
    return "night";
  };

  const timeOfDay = getTimeOfDay();
  return role === "client" ? clientTaglines[timeOfDay] : freelancerTaglines[timeOfDay];
}

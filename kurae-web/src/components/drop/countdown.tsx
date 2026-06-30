"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type CountdownProps = {
  targetDate: string;
  label: string;
  className?: string;
  onComplete?: () => void;
};

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function getTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: false,
  };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown({
  targetDate,
  label,
  className,
  onComplete,
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(targetDate),
  );
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
  }, [targetDate]);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  useEffect(() => {
    if (!timeLeft.done || completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [onComplete, timeLeft.done]);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs uppercase tracking-widest text-sakura-mist">{label}</p>
      {timeLeft.done ? (
        <p className="font-mono text-2xl font-semibold tabular-nums text-sakura-paper sm:text-3xl">
          00:00:00
        </p>
      ) : (
        <p className="font-mono text-2xl font-semibold tabular-nums text-sakura-paper sm:text-3xl">
          {timeLeft.days > 0 && `${pad(timeLeft.days)}:`}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </p>
      )}
    </div>
  );
}

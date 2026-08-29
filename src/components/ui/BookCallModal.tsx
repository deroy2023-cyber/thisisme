"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLenis } from "lenis/react";

interface TimeSlot {
  time: string;
  label: string;
}

interface BookCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "date" | "time" | "details" | "success" | "error";

export default function BookCallModal({ isOpen, onClose }: BookCallModalProps) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  // Generate next 14 days
  const getAvailableDates = () => {
    const dates: { value: string; dayName: string; dayNum: string; month: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      dates.push({
        value: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        dayNum: String(d.getDate()).padStart(2, "0"),
        month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      });
    }
    return dates;
  };

  const fetchSlots = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSlotsError("");
    try {
      const res = await fetch(`/api/calendar/slots?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load slots");
      setSlots(data.slots);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load available times";
      setSlotsError(msg);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
    setSelectedLabel("");
    fetchSlots(date);
    setStep("time");
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    setSelectedTime(slot.time);
    setSelectedLabel(slot.label);
    setStep("details");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/calendar/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");
      setStep("success");
    } catch {
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep("date");
      setSelectedDate("");
      setSelectedTime("");
      setSelectedLabel("");
      setSlots([]);
      setFormData({ name: "", email: "", message: "" });
      setSlotsError("");
    }, 300);
  };

  /* Pausing Lenis is the only thing that actually locks the page: it drives
     scroll imperatively on documentElement, so `overflow: hidden` alone does
     not hold it. This modal previously set body overflow only, and the page
     scrolled freely behind it on wheel and touch. Same pattern as
     fullscreen-menu.tsx, including the ref mirror — useLenis() returns
     undefined on the first render and the instance on the next, so reading it
     directly inside the effect would capture the undefined. Body overflow is
     kept as well, for the non-Lenis path (reduced motion, or before hydration). */
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const l = lenisRef.current;
    if (isOpen) {
      document.body.style.overflow = "hidden";
      l?.stop();
    } else {
      document.body.style.overflow = "";
      l?.start();
    }
    return () => {
      document.body.style.overflow = "";
      l?.start();
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, handleClose]);

  const dates = getAvailableDates();

  const formatSelectedDate = () => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            /* flex column + max-h-[85dvh]: the body below is `flex-1 min-h-0`
               and takes whatever is left after the header, instead of being
               sized by calc(85vh - 100px) where the 100 was a guess at the
               header's height. The real header measures ~106px once the md:
               heading step applies, so the scroll region was 6px too tall and
               its last rows were clipped by this overflow-hidden — more once
               the subtitle wrapped on a narrow screen. dvh so the on-screen
               keyboard cannot push the submit button out of reach. */
            className="relative flex flex-col w-[94vw] max-w-[520px] max-h-[85dvh] bg-white overflow-hidden"
            style={{ borderRadius: 0 }}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <h3
                  className="font-coolvetica text-[28px] md:text-[34px] text-primary-red leading-tight"
                  style={{ letterSpacing: "0" }}
                >
                  {step === "success"
                    ? "YOU'RE IN."
                    : step === "error"
                    ? "OOPS."
                    : "BOOK A CALL"}
                </h3>
                {step === "date" && (
                  <p className="font-[var(--font-dm-sans)] text-[13px] text-medium-gray mt-1">
                    Pick a date that works for you
                  </p>
                )}
                {step === "time" && (
                  <p className="font-[var(--font-dm-sans)] text-[13px] text-medium-gray mt-1">
                    {formatSelectedDate()} — choose a time
                  </p>
                )}
                {step === "details" && (
                  <p className="font-[var(--font-dm-sans)] text-[13px] text-medium-gray mt-1">
                    {formatSelectedDate()} at {selectedLabel}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center text-primary-red hover:bg-primary-red/5 transition-colors"
                data-hover
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="h-[2px] bg-primary-red/10 mx-6 shrink-0" />

            {/* Content */}
            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              <AnimatePresence mode="wait">
                {/* ─── STEP: DATE ─── */}
                {step === "date" && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {dates.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => handleDateSelect(d.value)}
                          className="group flex flex-col items-center py-3 px-1 border-2 border-primary-red/10 hover:border-primary-red hover:bg-primary-red/5 transition-all duration-200"
                          data-hover
                        >
                          <span className="font-coolvetica text-[11px] text-medium-gray group-hover:text-primary-red transition-colors">
                            {d.dayName}
                          </span>
                          <span className="font-coolvetica text-[22px] text-off-black group-hover:text-primary-red transition-colors leading-tight">
                            {d.dayNum}
                          </span>
                          <span className="font-coolvetica text-[11px] text-medium-gray group-hover:text-primary-red transition-colors">
                            {d.month}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP: TIME ─── */}
                {step === "time" && (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <button
                      onClick={() => setStep("date")}
                      className="flex items-center gap-1 font-coolvetica text-[14px] text-primary-red hover:opacity-70 transition-opacity mb-4"
                      data-hover
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      CHANGE DATE
                    </button>

                    {loadingSlots ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-6 h-6 border-2 border-primary-red/20 border-t-primary-red rounded-full animate-spin" />
                        <span className="font-coolvetica text-[14px] text-medium-gray">
                          LOADING SLOTS...
                        </span>
                      </div>
                    ) : slotsError ? (
                      <div className="text-center py-12">
                        <p className="font-coolvetica text-[16px] text-primary-red">
                          {slotsError}
                        </p>
                        <button
                          onClick={() => fetchSlots(selectedDate)}
                          className="mt-3 font-coolvetica text-[14px] text-primary-red underline hover:opacity-70 transition-opacity"
                          data-hover
                        >
                          RETRY
                        </button>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="font-coolvetica text-[18px] text-off-black">
                          NO SLOTS AVAILABLE
                        </p>
                        <p className="font-[var(--font-dm-sans)] text-[13px] text-medium-gray mt-2">
                          Try a different date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => handleTimeSelect(slot)}
                            className="py-3 px-4 border-2 border-primary-red/10 hover:border-primary-red hover:bg-primary-red/5 transition-all duration-200 text-center"
                            data-hover
                          >
                            <span className="font-coolvetica text-[18px] text-off-black group-hover:text-primary-red">
                              {slot.label.toUpperCase()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ─── STEP: DETAILS ─── */}
                {step === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <button
                      onClick={() => setStep("time")}
                      className="flex items-center gap-1 font-coolvetica text-[14px] text-primary-red hover:opacity-70 transition-opacity mb-4"
                      data-hover
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      CHANGE TIME
                    </button>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      <div>
                        <label className="font-coolvetica text-[14px] text-off-black block mb-1">
                          NAME *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Your name"
                          className="w-full px-4 py-3 border-2 border-primary-red/10 focus:border-primary-red outline-none transition-colors font-[var(--font-dm-sans)] text-[14px] text-off-black placeholder:text-light-gray"
                          data-hover
                        />
                      </div>
                      <div>
                        <label className="font-coolvetica text-[14px] text-off-black block mb-1">
                          EMAIL *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="you@company.com"
                          className="w-full px-4 py-3 border-2 border-primary-red/10 focus:border-primary-red outline-none transition-colors font-[var(--font-dm-sans)] text-[14px] text-off-black placeholder:text-light-gray"
                          data-hover
                        />
                      </div>
                      <div>
                        <label className="font-coolvetica text-[14px] text-off-black block mb-1">
                          MESSAGE
                        </label>
                        <textarea
                          value={formData.message}
                          onChange={(e) =>
                            setFormData({ ...formData, message: e.target.value })
                          }
                          placeholder="Tell us a bit about your project..."
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-primary-red/10 focus:border-primary-red outline-none transition-colors font-[var(--font-dm-sans)] text-[14px] text-off-black placeholder:text-light-gray resize-none"
                          data-hover
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-primary-red text-white font-coolvetica text-[18px] hover:bg-accent-red transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        data-hover
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            BOOKING...
                          </>
                        ) : (
                          "CONFIRM BOOKING"
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* ─── STEP: SUCCESS ─── */}
                {step === "success" && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center text-center py-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary-red/10 flex items-center justify-center mb-4">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path
                          d="M7 14.5L12 19.5L21 8.5"
                          stroke="#9f0c09"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p className="font-coolvetica text-[20px] text-off-black mb-2">
                      CALL BOOKED SUCCESSFULLY
                    </p>
                    <p className="font-[var(--font-dm-sans)] text-[14px] text-medium-gray max-w-[300px]">
                      {formatSelectedDate()} at {selectedLabel}. We&apos;ll send
                      a calendar invite to your email.
                    </p>
                    <button
                      onClick={handleClose}
                      className="mt-6 px-8 py-3 bg-primary-red text-white font-coolvetica text-[16px] hover:bg-accent-red transition-colors"
                      data-hover
                    >
                      DONE
                    </button>
                  </motion.div>
                )}

                {/* ─── STEP: ERROR ─── */}
                {step === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center text-center py-8"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary-red/10 flex items-center justify-center mb-4">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path
                          d="M10 10L18 18M18 10L10 18"
                          stroke="#9f0c09"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <p className="font-coolvetica text-[20px] text-off-black mb-2">
                      SOMETHING WENT WRONG
                    </p>
                    <p className="font-[var(--font-dm-sans)] text-[14px] text-medium-gray max-w-[300px]">
                      We couldn&apos;t book your call. Please try again or reach
                      out to us directly.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-6">
                      <button
                        onClick={() => setStep("details")}
                        className="px-6 py-3 border-2 border-primary-red text-primary-red font-coolvetica text-[16px] hover:bg-primary-red/5 transition-colors"
                        data-hover
                      >
                        TRY AGAIN
                      </button>
                      <a
                        href="mailto:contact@atwostudios.com"
                        className="px-6 py-3 bg-primary-red text-white font-coolvetica text-[16px] hover:bg-accent-red transition-colors"
                        data-hover
                      >
                        EMAIL US
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface GlassmorphicPillProps {
  label: string;
}

export default function GlassmorphicPill({ label }: GlassmorphicPillProps) {
  return (
    <span
      /* Sizing moved out of the inline style object and into classes: an
         inline style cannot be reached by a media query, so every dimension
         here was frozen at one value from a 320px phone to a 4K display. The
         pill also had no width bound at all, so a long tag could run past the
         card edge and clip against the card's overflow-hidden; max-w + truncate
         bound it to the card instead. */
      className="backdrop-blur-sm bg-white/75 rounded-full text-black underline
        text-[clamp(11px,1vw,13px)] leading-[1.55] tracking-[-0.18px]
        px-[clamp(10px,1.2vw,16px)] py-[clamp(3px,0.5vw,5px)]
        inline-block max-w-full truncate align-top"
      style={{
        fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

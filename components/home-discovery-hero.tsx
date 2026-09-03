import {
  ArrowRight,
  Blocks,
  Bot,
  Code2,
  Palette,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

type HomeDiscoveryHeroProps = {
  headline: string;
  subheadline: string;
  exploreCta: string;
};

type FloatingMark = {
  id: string;
  Icon: LucideIcon;
  className: string;
  iconClassName: string;
};

const FLOATING_MARKS: readonly FloatingMark[] = [
  {
    id: "palette",
    Icon: Palette,
    className: "left-[3%] top-[18%] -rotate-12",
    iconClassName: "text-[#f24e1e]",
  },
  {
    id: "blocks",
    Icon: Blocks,
    className: "bottom-[-1.25rem] left-[8%] rotate-6",
    iconClassName: "text-[#3976f6]",
  },
  {
    id: "code",
    Icon: Code2,
    className: "bottom-[16%] left-[21%] -rotate-[18deg]",
    iconClassName: "text-[#141922]",
  },
  {
    id: "sparkles",
    Icon: Sparkles,
    className: "right-[6%] top-[14%] rotate-12",
    iconClassName: "text-[#7557f5]",
  },
  {
    id: "bot",
    Icon: Bot,
    className: "bottom-[13%] right-[10%] rotate-[10deg]",
    iconClassName: "text-[#f2a90c]",
  },
  {
    id: "wand",
    Icon: WandSparkles,
    className: "bottom-[-0.6rem] right-[-0.4rem] -rotate-12",
    iconClassName: "text-[#25a96d]",
  },
];

export function HomeDiscoveryHero({
  headline,
  subheadline,
  exploreCta,
}: HomeDiscoveryHeroProps) {
  return (
    <section
      className="relative isolate mb-9 overflow-hidden rounded-[1.5rem] border border-[#dce7f8] bg-[#eaf2ff] px-5 py-14 sm:mb-12 sm:px-10 sm:py-16 lg:mb-14 lg:min-h-[27rem] lg:px-16 lg:py-20"
      style={{
        backgroundImage:
          "radial-gradient(circle at 8% 14%, rgba(255,255,255,0.92), transparent 30%), radial-gradient(circle at 93% 82%, rgba(255,255,255,0.82), transparent 34%), linear-gradient(128deg, rgba(230,231,255,0.82), rgba(232,245,255,0.9))",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(86,126,194,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(86,126,194,0.07)_1px,transparent_1px)] [background-size:28px_28px]"
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
        {FLOATING_MARKS.map(({ id, Icon, className, iconClassName }) => (
          <div
            key={id}
            className={`absolute flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-[1.35rem] border border-white/80 bg-white/95 shadow-[0_12px_26px_rgba(57,82,132,0.16)] ${className}`}
          >
            <Icon className={`h-9 w-9 stroke-[1.8] ${iconClassName}`} />
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center lg:min-h-[16.5rem] lg:justify-center">
        <h1 className="max-w-5xl text-balance text-[2rem] font-semibold leading-[1.12] tracking-[-0.055em] text-slate-950 sm:text-[2.5rem] lg:text-[2.75rem]">
          {headline}
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-sm leading-6 text-slate-600 sm:mt-6 sm:text-base sm:leading-7">
          {subheadline}
        </p>
        <Button
          asChild
          size="lg"
          className="mt-7 h-12 rounded-full bg-[#2f6df6] px-6 text-sm font-semibold shadow-[0_10px_24px_rgba(47,109,246,0.28)] transition-transform hover:-translate-y-0.5 hover:bg-[#245de1] sm:mt-8 sm:h-14 sm:px-8 sm:text-base"
        >
          <Link href="/c">
            {exploreCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

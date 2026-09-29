"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";

const FILLS = ["bg-lilac", "bg-mint", "bg-butter", "bg-tomato", "bg-lilac"];

export function PopFaq({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-[1.75rem] border-[3px] border-plum transition-colors duration-300 ${
              isOpen ? `${FILLS[i % FILLS.length]} shadow-[6px_6px_0_0_#3b1a3f]` : "bg-white shadow-[3px_3px_0_0_#3b1a3f]"
            }`}
          >
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${base}-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-16 w-full items-center justify-between gap-6 px-6 py-5 text-left font-chunky text-xl font-extrabold text-plum sm:text-2xl"
              >
                {item.q}
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 135 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-plum bg-white text-2xl leading-none"
                >
                  +
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${base}-${i}`}
                  role="region"
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-6 text-lg font-medium text-plum/85">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

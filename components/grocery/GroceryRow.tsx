"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useLocale } from "next-intl";
import { Checkbox } from "@/components/ui/misc";
import { cn } from "@/lib/cn";
import { formatQuantity } from "@/lib/units";
import type { Member } from "@/lib/types";
import type { GroceryItem } from "@/lib/types";

interface RowProps {
  item: GroceryItem;
  member?: Member;
  showRecipe: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

function RowContent({ item, member, showRecipe, onToggle, onEdit, handle }: RowProps & { handle?: React.ReactNode }) {
  const locale = useLocale();
  const qty = formatQuantity(item.qty, item.unit, locale);
  return (
    <div className="flex items-start gap-3 py-3 pr-1">
      <button aria-label={item.name} onClick={onToggle} className="-m-2 p-2">
        <Checkbox checked={item.checked} />
      </button>
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={cn("block text-[16px] leading-snug", item.checked && "text-faint line-through")}>
          {qty && <b className="font-semibold">{qty} </b>}
          {item.name}
          {item.note && <span className="text-muted">, {item.note}</span>}
        </span>
        {showRecipe && item.recipeTitle && <span className="mt-0.5 block truncate text-[13px] text-muted">{item.recipeTitle}</span>}
      </button>
      {member && (
        <span
          title={member.displayName}
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px]"
          style={{ backgroundColor: `${member.color}22` }}
        >
          {member.avatar}
        </span>
      )}
      {handle}
    </div>
  );
}

export function GroceryRow(props: RowProps) {
  return <RowContent {...props} />;
}

export function SortableGroceryRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative bg-paper", isDragging && "z-10 shadow-lg")}
    >
      <RowContent
        {...props}
        handle={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label="Drag"
            className="-my-1 touch-none p-1 text-faint active:text-ink"
          >
            <GripVertical className="size-5" />
          </button>
        }
      />
    </div>
  );
}

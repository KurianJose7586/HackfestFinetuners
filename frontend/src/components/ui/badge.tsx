import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
                draft: "border-transparent bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                "in-progress": "border-transparent bg-blue-500/10 text-blue-400 border-blue-500/20",
                completed: "border-transparent bg-green-500/10 text-green-400 border-green-500/20",
                idle: "border-transparent bg-gray-500/10 text-gray-400 border-gray-500/20",
                working: "border-transparent bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse",
                done: "border-transparent bg-green-500/10 text-green-400 border-green-500/20",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };

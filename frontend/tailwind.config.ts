import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: ["class", "class"],
    theme: {
    	extend: {
    		colors: {
    			signal: {
    				requirement: '#3B82F6',
    				decision: '#8B5CF6',
    				feedback: '#F59E0B',
    				timeline: '#10B981',
    				noise: '#6B7280'
    			},
    			severity: {
    				high: '#EF4444',
    				medium: '#F59E0B',
    				low: '#3B82F6'
    			},
    			path: {
    				heuristic: '#10B981',
    				'domain-gate': '#6B7280',
    				llm: '#8B5CF6'
    			},
    			pipeline: {
    				complete: '#10B981',
    				running: '#F59E0B',
    				pending: '#D1D5DB',
    				error: '#EF4444'
    			},
    			background: 'hsl(var(--background))',
    			foreground: 'hsl(var(--foreground))',
    			card: {
    				DEFAULT: 'hsl(var(--card))',
    				foreground: 'hsl(var(--card-foreground))'
    			},
    			popover: {
    				DEFAULT: 'hsl(var(--popover))',
    				foreground: 'hsl(var(--popover-foreground))'
    			},
    			primary: {
    				DEFAULT: 'hsl(var(--primary))',
    				foreground: 'hsl(var(--primary-foreground))'
    			},
    			secondary: {
    				DEFAULT: 'hsl(var(--secondary))',
    				foreground: 'hsl(var(--secondary-foreground))'
    			},
    			muted: {
    				DEFAULT: 'hsl(var(--muted))',
    				foreground: 'hsl(var(--muted-foreground))'
    			},
    			accent: {
    				DEFAULT: 'hsl(var(--accent))',
    				foreground: 'hsl(var(--accent-foreground))'
    			},
    			destructive: {
    				DEFAULT: 'hsl(var(--destructive))',
    				foreground: 'hsl(var(--destructive-foreground))'
    			},
    			border: 'hsl(var(--border))',
    			input: 'hsl(var(--input))',
    			ring: 'hsl(var(--ring))',
    			chart: {
    				'1': 'hsl(var(--chart-1))',
    				'2': 'hsl(var(--chart-2))',
    				'3': 'hsl(var(--chart-3))',
    				'4': 'hsl(var(--chart-4))',
    				'5': 'hsl(var(--chart-5))'
    			}
    		},
    		fontFamily: {
    			sans: [
    				'Inter',
    				'system-ui',
    				'sans-serif'
    			],
    			mono: [
    				'JetBrains Mono',
    				'Menlo',
    				'monospace'
    			]
    		},
    		spacing: {
    			'18': '4.5rem',
    			'22': '5.5rem'
    		},
    		borderRadius: {
    			card: '8px',
    			badge: '4px',
    			modal: '12px',
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
    		},
    		boxShadow: {
    			glass: '0 8px 32px rgba(0,0,0,0.40)',
    			'glass-lg': '0 20px 60px rgba(0,0,0,0.55)',
    			'glow-cyan': '0 0 24px rgba(6,182,212,0.30)',
    			'glow-purple': '0 0 24px rgba(139,92,246,0.30)',
    			'glow-green': '0 0 24px rgba(16,185,129,0.25)',
    			'glow-amber': '0 0 24px rgba(245,158,11,0.25)',
    			'glow-red': '0 0 24px rgba(239,68,68,0.25)'
    		},
    		animation: {
    			'pulse-slow': 'pulse 3s ease-in-out infinite',
    			shimmer: 'shimmer 2s linear infinite',
    			'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16,1,0.3,1) forwards'
    		},
    		backgroundImage: {
    			'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    			'brand-gradient': 'linear-gradient(135deg, #22d3ee, #818cf8, #c084fc)',
    			'cyan-gradient': 'linear-gradient(135deg, #0ea5e9, #06b6d4)'
    		}
    	}
    },
    plugins: [require("tailwindcss-animate")],
};

export default config;

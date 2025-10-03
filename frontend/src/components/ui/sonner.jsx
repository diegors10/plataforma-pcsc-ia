import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      className="toaster group"
      style={{
        // já existiam:
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",

        // ✅ ADICIONE: cores para sucesso (verde)
        "--success-bg": "#16a34a",        // green-600
        "--success-text": "#ffffff",
        "--success-border": "#16a34a",

        // ✅ ADICIONE: cores para erro (vermelho)
        "--error-bg": "#dc2626",          // red-600
        "--error-text": "#ffffff",
        "--error-border": "#dc2626",
      }}
      {...props}
    />
  );
};

export { Toaster };

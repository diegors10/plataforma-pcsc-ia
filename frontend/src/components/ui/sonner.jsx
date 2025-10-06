import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      // Duração padrão de 5 segundos para todas as notificações
      duration={5000}
      className="toaster group"
      style={{
        // já existiam:
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",

        // ✅ Cores para sucesso (verde)
        "--success-bg": "#16a34a",        // green-600
        "--success-text": "#ffffff",
        "--success-border": "#16a34a",

        // ✅ Cores para erro (vermelho)
        "--error-bg": "#dc2626",          // red-600
        "--error-text": "#ffffff",
        "--error-border": "#dc2626",
      }}
      {...props}
    />
  );
};

export { Toaster };

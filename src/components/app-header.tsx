import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  HistoryIcon,
  InfoIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  RadioIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import { AppIcon, Wordmark } from "#/components/brand.tsx";
import { type Theme, useTheme } from "#/components/theme-context.ts";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { authClient } from "#/lib/auth-client.ts";
import type { Viewer } from "#/server/functions/viewer.ts";

const NAV = [
  { to: "/listen", label: "Listen", icon: RadioIcon },
  { to: "/history", label: "History", icon: HistoryIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link aria-label="Nueslify" className="flex items-center gap-2" to="/listen">
          <AppIcon size={30} />
          <Wordmark className="hidden text-2xl sm:inline" />
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              key={item.to}
              activeProps={{
                className: "bg-accent text-accent-foreground",
                "aria-current": "page",
              }}
              to={item.to}
            >
              <item.icon aria-hidden="true" />
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sr-only sm:hidden">{item.label}</span>
            </Link>
          ))}
        </nav>
        <UserMenu viewer={viewer} />
      </div>
    </header>
  );
}

const THEMES: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

function UserMenu({ viewer }: { viewer: Viewer }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initials = viewer.name.slice(0, 1).toUpperCase() || "?";

  const signOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    await navigate({ to: "/" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label="Account menu" className="rounded-full" size="icon" variant="ghost" />
        }
      >
        <Avatar className="size-8">
          {viewer.image ? <AvatarImage alt="" src={viewer.image} /> : null}
          <AvatarFallback className="bg-primary font-semibold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-foreground">{viewer.name}</span>
            <span className="truncate font-normal text-muted-foreground text-xs">
              {viewer.email}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value: unknown) => {
              const match = THEMES.find((option) => option.value === value);
              if (match) {
                setTheme(match.value);
              }
            }}
            value={theme}
          >
            {THEMES.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                <option.icon aria-hidden="true" /> {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link to="/about" />}>
          <InfoIcon aria-hidden="true" /> About &amp; attribution
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOut()}>
          <LogOutIcon aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

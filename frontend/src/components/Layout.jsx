import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  BellRing,
  Boxes,
  LayoutDashboard,
  LogOut,
  Snowflake,
  Truck,
  Upload,
  Warehouse,
} from 'lucide-react'
import { useAuth } from '../store/auth'
import { humanise } from '../lib/format'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/shipments', label: 'Shipments', icon: Truck },
  { to: '/alerts', label: 'Alerts', icon: BellRing },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/upload', label: 'Data Upload', icon: Upload },
  { to: '/products', label: 'Products', icon: Boxes },
  { to: '/facilities', label: 'Facilities', icon: Warehouse },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-r border-sand-200 bg-white/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
            <Snowflake size={22} />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold leading-none text-sand-800">Cold Chain</p>
            <p className="text-xs text-sand-500">Logistics Monitor</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow'
                    : 'text-sand-600 hover:bg-white hover:text-sand-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-sand-200 bg-white/80 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-grape-100 text-sm font-bold text-grape-700">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sand-800">{user?.name}</p>
              <p className="truncate text-xs text-sand-500">{humanise(user?.role)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="btn btn-ghost mt-3 w-full !py-2 text-xs"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sand-200 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <Snowflake size={18} />
            </span>
            <span className="font-display font-extrabold text-sand-800">Cold Chain</span>
          </div>
          <div className="hidden items-center gap-2 text-sm text-sand-500 lg:flex">
            <Activity size={16} className="text-brand-600" />
            <span>Live temperature monitoring across all active lanes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="pill bg-mint-100 text-mint-700">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-500" /> Connected
            </span>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-sand-200 bg-white/60 px-3 py-2 lg:hidden">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  isActive ? 'bg-brand-500 text-white' : 'text-sand-600'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

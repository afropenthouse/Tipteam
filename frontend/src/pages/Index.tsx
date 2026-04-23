import { Link } from "react-router-dom";
import { ArrowRight, QrCode, Star, Wallet, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold">
              T
            </div>
            <span className="font-semibold">Tracla</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-gradient-primary shadow-elegant">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
              For modern hospitality teams
            </span>
             <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
               Capture honest feedback.
               <br />
               <span className="text-primary">Get tipped instantly.</span>
             </h1>
            <p className="mt-5 max-w-xl text-base text-primary-foreground/70 md:text-lg">
              One QR code per location. Customers rate your service, share complaints, and tip your team —
              all in seconds. You see everything in one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-elegant">
                <Link to="/signup">
                  Start free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: QrCode, title: "One QR per business", desc: "Print it, share it, paste it on receipts." },
            { icon: Star, title: "Star ratings", desc: "Frictionless 1–5 star feedback in seconds." },
            { icon: MessageSquareWarning, title: "Real complaints", desc: "Hear what guests won't say to your face." },
            { icon: Wallet, title: "Tip wallet", desc: "Customers tip your team. Withdraw on demand." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;

import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Heart, Compass, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({ component: About });

function About() {
  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero">
        <div className="container-page py-20 text-center md:py-28">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Sobre a Lumière
          </span>
          <h1 className="font-display text-5xl leading-[1.05] md:text-6xl">
            Curadoria que vira <span className="italic text-accent">história</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-muted-foreground md:text-lg">
            A Lumière nasceu da vontade de tornar o dia a dia mais bonito, através de produtos
            escolhidos com cuidado, qualidade real e um olhar apaixonado por design.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-card p-6 shadow-card md:p-8">
            <h2 className="mb-3 font-display text-2xl">Quem somos</h2>
            <p className="text-muted-foreground">
              Somos uma loja online brasileira dedicada a reunir, em um só lugar, marcas e produtos
              que unem design, funcionalidade e durabilidade. Cada item do nosso catálogo passa por
              uma curadoria cuidadosa antes de chegar até você.
            </p>
            <p className="mt-3 text-muted-foreground">
              Acreditamos que comprar bem não precisa ser complicado — por isso investimos em uma
              experiência de compra simples, transparente e feita para durar, do clique à entrega.
            </p>
          </div>

          <div className="rounded-2xl bg-card p-6 shadow-card md:p-8">
            <h2 className="mb-3 font-display text-2xl">Nossa história</h2>
            <p className="text-muted-foreground">
              A Lumière começou com uma pergunta simples: por que é tão difícil encontrar produtos
              bonitos e bem feitos sem gastar horas pesquisando? A partir dessa inquietação, reunimos
              uma equipe apaixonada por design e varejo para criar uma loja que resolvesse isso.
            </p>
            <p className="mt-3 text-muted-foreground">
              Hoje seguimos crescendo, sempre com o mesmo compromisso do primeiro dia: entregar mais
              brilho para o cotidiano de quem confia em nós.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-card p-6 text-center shadow-card">
            <Compass className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-display text-lg">Missão</h3>
            <p className="text-sm text-muted-foreground">
              Tornar acessível uma curadoria de produtos de qualidade, com uma experiência de compra
              simples e confiável para todo o Brasil.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-center shadow-card">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-display text-lg">Visão</h3>
            <p className="text-sm text-muted-foreground">
              Ser reconhecida como a loja de referência em curadoria de estilo de vida, sinônimo de
              bom gosto e confiança.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-center shadow-card">
            <Gem className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-display text-lg">Valores</h3>
            <p className="text-sm text-muted-foreground">
              Qualidade em primeiro lugar, transparência com o cliente e respeito em cada etapa da
              jornada de compra.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-6 text-center shadow-card">
            <Heart className="mx-auto mb-3 h-8 w-8 text-accent" />
            <h3 className="mb-2 font-display text-lg">Cuidado</h3>
            <p className="text-sm text-muted-foreground">
              Do empacotamento ao pós-venda, tratamos cada pedido como se fosse para alguém que
              amamos.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <h2 className="mb-3 font-display text-2xl">Vamos juntos?</h2>
          <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
            Explore nossa coleção e descubra por que tantas pessoas escolheram a Lumière para deixar
            seu dia a dia com mais brilho.
          </p>
          <Button size="lg" asChild>
            <Link to="/shop">Ver produtos</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, PackageCheck, Wrench, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/returns")({ component: Returns });

function Returns() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl">Trocas e Devoluções</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Queremos que você compre com tranquilidade. Conheça abaixo como funcionam as trocas,
          devoluções e reembolsos na Lumière.
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-card p-6 shadow-card">
          <CalendarClock className="mb-3 h-7 w-7 text-accent" aria-hidden="true" />
          <h2 className="mb-2 font-display text-lg">Direito de arrependimento (7 dias)</h2>
          <p className="text-sm text-muted-foreground">
            De acordo com o artigo 49 do Código de Defesa do Consumidor, por se tratar de uma compra
            realizada fora do estabelecimento comercial (e-commerce), você tem até 7 dias corridos a
            partir do recebimento do produto para desistir da compra, sem necessidade de justificar
            o motivo e com reembolso integral, incluindo o valor do frete.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card">
          <Wrench className="mb-3 h-7 w-7 text-accent" aria-hidden="true" />
          <h2 className="mb-2 font-display text-lg">Produto com defeito</h2>
          <p className="text-sm text-muted-foreground">
            Caso o produto apresente defeito de fabricação, você tem até 90 dias após o recebimento
            para solicitar a troca, o reparo ou o reembolso, conforme garantido pelo Código de
            Defesa do Consumidor.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card">
          <PackageCheck className="mb-3 h-7 w-7 text-accent" aria-hidden="true" />
          <h2 className="mb-2 font-display text-lg">Como solicitar</h2>
          <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
            <li>
              Acesse{" "}
              <Link to="/profile" className="text-accent underline underline-offset-2">
                Minha conta
              </Link>{" "}
              e localize o pedido, ou fale com a gente pela{" "}
              <Link to="/contact" className="text-accent underline underline-offset-2">
                página de Contato
              </Link>
              .
            </li>
            <li>Informe o motivo da troca ou devolução e anexe fotos, se houver defeito.</li>
            <li>Aguarde nossa confirmação com as instruções de envio do produto.</li>
            <li>Envie o produto na embalagem original, sempre que possível.</li>
          </ol>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card">
          <RefreshCw className="mb-3 h-7 w-7 text-accent" aria-hidden="true" />
          <h2 className="mb-2 font-display text-lg">Prazos de reembolso</h2>
          <p className="text-sm text-muted-foreground">
            Após recebermos e inspecionarmos o produto devolvido, o reembolso é processado em até 10
            dias úteis. Compras no cartão de crédito são estornadas na fatura (o prazo de
            visualização depende da operadora do cartão); compras via PIX ou boleto são reembolsadas
            diretamente na conta informada.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-accent/30 bg-accent/5 p-6 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Importante:</strong> para agilizar sua solicitação,
          mantenha o produto em boas condições de uso, com embalagem, manual e acessórios originais
          sempre que possível. Em caso de dúvidas, nossa equipe está à disposição pela{" "}
          <Link to="/contact" className="text-accent underline underline-offset-2">
            página de Contato
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

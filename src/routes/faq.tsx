import { createFileRoute, Link } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/faq")({ component: Faq });

const FAQS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "Quais formas de pagamento vocês aceitam?",
    answer: "Aceitamos PIX, boleto bancário e cartão de crédito. O PIX é aprovado na hora e o boleto pode levar até 3 dias úteis para ser compensado.",
  },
  {
    question: "Qual o prazo de entrega dos pedidos?",
    answer: "O prazo varia de acordo com a sua região, mas em média os pedidos chegam entre 5 e 7 dias úteis após a confirmação do pagamento. Você recebe o código de rastreio por e-mail assim que o pedido é despachado.",
  },
  {
    question: "Como acompanho o status do meu pedido?",
    answer: (
      <>
        Basta acessar{" "}
        <Link to="/profile" className="text-accent underline underline-offset-2">
          Minha conta
        </Link>{" "}
        e consultar a seção de pedidos. Lá você encontra o status atualizado e o código de rastreio.
      </>
    ),
  },
  {
    question: "O frete é grátis?",
    answer: "Sim! Compras acima de R$ 199 têm frete grátis para todo o Brasil. Abaixo desse valor, o frete é calculado no carrinho de acordo com o seu CEP.",
  },
  {
    question: "Posso trocar ou devolver um produto?",
    answer: (
      <>
        Sim. Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, sem
        precisar justificar o motivo, conforme o Código de Defesa do Consumidor. Veja todos os
        detalhes na página de{" "}
        <Link to="/returns" className="text-accent underline underline-offset-2">
          Trocas e Devoluções
        </Link>
        .
      </>
    ),
  },
  {
    question: "Em quanto tempo recebo o reembolso de uma devolução?",
    answer: "Após recebermos e inspecionarmos o produto devolvido, o reembolso é processado em até 10 dias úteis, utilizando o mesmo meio de pagamento da compra.",
  },
  {
    question: "O produto veio com defeito. E agora?",
    answer: (
      <>
        Sentimos muito! Entre em contato pela nossa{" "}
        <Link to="/contact" className="text-accent underline underline-offset-2">
          página de contato
        </Link>{" "}
        em até 90 dias após a compra e faremos a troca ou o reembolso conforme o Código de Defesa do
        Consumidor.
      </>
    ),
  },
  {
    question: "Vocês entregam em todo o Brasil?",
    answer: "Sim, entregamos para todos os estados brasileiros através de transportadoras parceiras.",
  },
  {
    question: "Posso alterar o endereço de entrega depois de finalizar a compra?",
    answer: "Se o pedido ainda não tiver sido despachado, entre em contato o quanto antes pelo nosso canal de atendimento que tentaremos atualizar o endereço.",
  },
  {
    question: "Como funciona o pagamento via PIX?",
    answer: "Ao escolher PIX no checkout, geramos um QR Code e um código 'copia e cola' na hora. Basta pagar pelo app do seu banco — a confirmação costuma ser instantânea.",
  },
];

function Faq() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl md:text-5xl">Perguntas frequentes</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Reunimos as dúvidas mais comuns sobre pedidos, pagamento, entrega e trocas. Não encontrou
          o que procurava?{" "}
          <Link to="/contact" className="text-accent underline underline-offset-2">
            Fale com a gente
          </Link>
          .
        </p>
      </div>

      <div className="mx-auto max-w-3xl rounded-2xl bg-card p-6 shadow-card md:p-8">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="font-display text-base">{item.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

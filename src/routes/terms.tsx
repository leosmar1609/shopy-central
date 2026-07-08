import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/terms")({ component: Terms });

function Terms() {
  return (
    <div className="container-page py-12 md:py-16">
      <h1 className="mb-4 font-display text-4xl md:text-5xl">Termos de Uso</h1>
      <p className="mb-6 text-sm text-muted-foreground">Última atualização: julho de 2026.</p>

      <div className="mb-8 flex gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p>
          <strong>Aviso:</strong> este texto é um modelo genérico de Termos de Uso e não constitui
          aconselhamento jurídico. Recomendamos que um advogado revise e adapte este documento à
          realidade da sua operação antes de publicá-lo em produção.
        </p>
      </div>

      <div className="max-w-3xl space-y-8 rounded-2xl bg-card p-6 shadow-card md:p-8">
        <section>
          <h2 className="mb-2 font-display text-xl">1. Aceitação dos termos</h2>
          <p className="text-muted-foreground">
            Ao acessar e utilizar o site da Lumière, você concorda integralmente com os presentes
            Termos de Uso. Caso não concorde com alguma das condições aqui descritas, recomendamos
            que não utilize nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">2. Cadastro e conta do usuário</h2>
          <p className="text-muted-foreground">
            Para realizar compras, é necessário criar uma conta com informações verdadeiras,
            completas e atualizadas. Você é responsável por manter a confidencialidade de sua senha
            e por todas as atividades realizadas em sua conta.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">3. Produtos, preços e disponibilidade</h2>
          <p className="text-muted-foreground">
            Envidamos esforços para manter as informações de produtos, preços e estoque atualizadas,
            mas erros podem ocorrer. Reservamo-nos o direito de corrigir preços incorretos e de
            cancelar pedidos afetados por tais erros, com reembolso integral quando aplicável.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">4. Pedidos e pagamento</h2>
          <p className="text-muted-foreground">
            Os pedidos são confirmados somente após a aprovação do pagamento, realizado via PIX,
            boleto bancário ou cartão de crédito através de processadoras de pagamento parceiras.
            A Lumière não armazena dados completos de cartão de crédito em seus próprios servidores.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">5. Entrega</h2>
          <p className="text-muted-foreground">
            Os prazos de entrega informados no checkout são estimativas e podem variar conforme a
            transportadora e a localidade de destino. A Lumière não se responsabiliza por atrasos
            causados por terceiros ou eventos fora de seu controle.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">6. Trocas, devoluções e reembolsos</h2>
          <p className="text-muted-foreground">
            As condições de troca e devolução seguem o Código de Defesa do Consumidor e estão
            detalhadas em nossa página de Trocas e Devoluções, incluindo o direito de arrependimento
            de 7 dias corridos após o recebimento do produto.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">7. Propriedade intelectual</h2>
          <p className="text-muted-foreground">
            Todo o conteúdo disponível no site — incluindo textos, imagens, logotipos e layout — é de
            propriedade da Lumière ou de seus licenciantes, sendo proibida a reprodução sem
            autorização prévia.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">8. Limitação de responsabilidade</h2>
          <p className="text-muted-foreground">
            A Lumière não se responsabiliza por danos indiretos decorrentes do uso ou da
            impossibilidade de uso do site, exceto nos casos previstos em lei.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">9. Alterações destes termos</h2>
          <p className="text-muted-foreground">
            Podemos atualizar estes Termos de Uso periodicamente. A versão vigente estará sempre
            disponível nesta página, com a data da última atualização indicada no topo.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">10. Contato</h2>
          <p className="text-muted-foreground">
            Em caso de dúvidas sobre estes Termos de Uso, entre em contato através da nossa página
            de Contato.
          </p>
        </section>
      </div>
    </div>
  );
}

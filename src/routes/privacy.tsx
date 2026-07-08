import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/privacy")({ component: Privacy });

function Privacy() {
  return (
    <div className="container-page py-12 md:py-16">
      <h1 className="mb-4 font-display text-4xl md:text-5xl">Política de Privacidade</h1>
      <p className="mb-6 text-sm text-muted-foreground">Última atualização: julho de 2026.</p>

      <div className="mb-8 flex gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4 text-sm">
        <AlertTriangle className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p>
          <strong>Aviso:</strong> este texto é um modelo genérico de Política de Privacidade
          inspirado na Lei Geral de Proteção de Dados (LGPD) e não constitui aconselhamento
          jurídico. Recomendamos que um advogado revise e adapte este documento à realidade da sua
          operação antes de publicá-lo em produção.
        </p>
      </div>

      <div className="max-w-3xl space-y-8 rounded-2xl bg-card p-6 shadow-card md:p-8">
        <section>
          <h2 className="mb-2 font-display text-xl">1. Quais dados coletamos</h2>
          <p className="text-muted-foreground">
            Coletamos dados fornecidos por você ao criar uma conta ou finalizar uma compra, como
            nome, e-mail, CPF, telefone e endereço de entrega. Também coletamos automaticamente
            dados de navegação, como páginas visitadas e cookies, para melhorar sua experiência.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">2. Finalidade do tratamento de dados</h2>
          <p className="text-muted-foreground">
            Utilizamos seus dados para processar pedidos, viabilizar pagamentos, realizar entregas,
            prestar suporte ao cliente, cumprir obrigações legais e fiscais, e enviar comunicações
            de marketing (quando você optar por recebê-las).
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">3. Compartilhamento de dados</h2>
          <p className="text-muted-foreground">
            Compartilhamos dados estritamente necessários com parceiros que viabilizam nossos
            serviços, como processadoras de pagamento e transportadoras. Não vendemos seus dados
            pessoais a terceiros.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">4. Cookies</h2>
          <p className="text-muted-foreground">
            Utilizamos cookies próprios e de terceiros para lembrar suas preferências, manter sua
            sessão ativa e entender como você utiliza o site. Você pode gerenciar ou desativar
            cookies diretamente nas configurações do seu navegador.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">5. Seus direitos como titular de dados</h2>
          <p className="text-muted-foreground">
            Nos termos da LGPD (Lei nº 13.709/2018), você tem direito a confirmar a existência de
            tratamento, acessar, corrigir, anonimizar, bloquear ou eliminar dados desnecessários,
            solicitar a portabilidade dos seus dados e revogar o consentimento a qualquer momento.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">6. Armazenamento e segurança</h2>
          <p className="text-muted-foreground">
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
            autorizado, perda ou alteração. Dados de cartão de crédito são processados diretamente
            por processadoras de pagamento parceiras, não sendo armazenados em nossos servidores.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">7. Retenção de dados</h2>
          <p className="text-muted-foreground">
            Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas nesta
            política e as obrigações legais e fiscais aplicáveis, sendo excluídos ou anonimizados
            após esse período.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">8. Como exercer seus direitos</h2>
          <p className="text-muted-foreground">
            Para exercer qualquer um dos direitos descritos acima, entre em contato através da nossa
            página de Contato, informando o direito que deseja exercer e os dados necessários para
            sua identificação.
          </p>
        </section>

        <section>
          <h2 className="mb-2 font-display text-xl">9. Alterações desta política</h2>
          <p className="text-muted-foreground">
            Esta Política de Privacidade pode ser atualizada periodicamente. A versão vigente estará
            sempre disponível nesta página, com a data da última atualização indicada no topo.
          </p>
        </section>
      </div>
    </div>
  );
}

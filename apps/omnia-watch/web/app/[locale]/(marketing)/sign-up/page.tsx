import { getDictionary, isLocale } from "@omnia-watch/i18n";
import { notFound } from "next/navigation";
import {
  sendMagicLinkAction,
  signInWithGoogleAction,
  signUpAction
} from "@/app/auth/actions";
import { AuthMethods } from "@/components/auth/auth-methods";
import { redirectIfAuthenticated } from "@/lib/server/auth";
import { siteConfig } from "@/lib/site";
import { Callout, Card } from "@omnia-watch/ui";

export default async function SignUpPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  await redirectIfAuthenticated(locale);
  const dictionary = getDictionary(locale);
  const credentialAction = signUpAction.bind(null, locale);
  const googleAction = signInWithGoogleAction.bind(null, locale);
  const magicLinkAction = sendMagicLinkAction.bind(null, locale);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-6 py-16 lg:px-8">
      <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Callout
          description={dictionary.marketing.signUp.subtitle}
          eyebrow={dictionary.common.productName}
          title={dictionary.marketing.signUp.title}
        />
        <Card className="space-y-5">
          <div>
            <h1 className="font-display text-3xl font-semibold text-text">
              {dictionary.forms.signUp}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              Omnia Watch is aligning with the future shared identity hub at{" "}
              <span className="font-medium text-text">{siteConfig.accountUrl}</span> while
              keeping the same Supabase project and callback model for this portal.
            </p>
          </div>
          <AuthMethods
            credentialAction={credentialAction}
            dividerLabel={dictionary.forms.orContinueWith}
            emailLabel={dictionary.forms.email}
            emailPlaceholder="name@company.com"
            googleAction={googleAction}
            googleLabel={dictionary.forms.continueWithGoogle}
            helperText={dictionary.forms.helperAuth}
            magicLinkAction={magicLinkAction}
            magicLinkHelperText={dictionary.forms.magicLinkHelper}
            magicLinkLabel={dictionary.forms.sendMagicLink}
            passwordLabel={dictionary.forms.password}
            passwordPlaceholder="********"
            submitLabel={dictionary.forms.signUp}
            workingLabel={dictionary.forms.working}
          />
        </Card>
      </div>
    </div>
  );
}

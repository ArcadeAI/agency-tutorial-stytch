"use client";
import {createStytchUIClient} from "@stytch/nextjs/ui";
import {StytchLogin, StytchProvider as _StytchProvider} from "@stytch/nextjs";
import {OTPMethods, Products, StytchClientOptions, StytchLoginConfig} from "@stytch/core/public";

const stytchOptions = {
    // Configure cookie settings, custom domains, etc.
} satisfies StytchClientOptions

const stytchClient = createStytchUIClient(
    process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!,
    stytchOptions
);

export const StytchProvider: React.FC<React.PropsWithChildren<unknown>> = ({children}) =>
    <_StytchProvider stytch={stytchClient}>{children}</_StytchProvider>


const loginConfig = {
    products: [Products.otp],
    otpOptions: {
        methods: [OTPMethods.Email],
        expirationMinutes: 5
    }
} satisfies StytchLoginConfig

const textConfig = {
["login.title"]: "Sign in to Chat"
}

export const LoginScreen = () =>
    <StytchLogin config={loginConfig} strings={textConfig}/>

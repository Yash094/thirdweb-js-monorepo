import styled from "@emotion/styled";
import {
  CardStackIcon,
  ChevronRightIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { trackPayEvent } from "../../../../../../../analytics/track/pay.js";
import type { Chain } from "../../../../../../../chains/types.js";
import type { ThirdwebClient } from "../../../../../../../client/client.js";
import type { Wallet } from "../../../../../../../wallets/interfaces/wallet.js";
import type { WalletId } from "../../../../../../../wallets/wallet-types.js";
import { useCustomTheme } from "../../../../../../core/design-system/CustomThemeProvider.js";
import {
  iconSize,
  radius,
  spacing,
} from "../../../../../../core/design-system/index.js";
import type { PayUIOptions } from "../../../../../../core/hooks/connection/ConnectButtonProps.js";
import {
  useChainMetadata,
  useChainName,
} from "../../../../../../core/hooks/others/useChainQuery.js";
import { useActiveAccount } from "../../../../../../core/hooks/wallets/useActiveAccount.js";
import { useActiveWallet } from "../../../../../../core/hooks/wallets/useActiveWallet.js";
import { useConnectedWallets } from "../../../../../../core/hooks/wallets/useConnectedWallets.js";
import { useDisconnect } from "../../../../../../core/hooks/wallets/useDisconnect.js";
import type {
  SupportedTokens,
  TokenInfo,
} from "../../../../../../core/utils/defaultTokens.js";
import { LoadingScreen } from "../../../../../wallets/shared/LoadingScreen.js";
import { Spacer } from "../../../../components/Spacer.js";
import { TextDivider } from "../../../../components/TextDivider.js";
import { TokenIcon } from "../../../../components/TokenIcon.js";
import { Container } from "../../../../components/basic.js";
import { Button } from "../../../../components/buttons.js";
import { Text } from "../../../../components/text.js";
import { OutlineWalletIcon } from "../../../icons/OutlineWalletIcon.js";
import { formatTokenBalance } from "../../formatTokenBalance.js";
import { type ERC20OrNativeToken, isNativeToken } from "../../nativeToken.js";
import { FiatValue } from "./FiatValue.js";
import { WalletRow } from "./WalletRow.js";
import {
  type TokenBalance,
  useWalletsAndBalances,
} from "./fetchBalancesForWallet.js";

export function TokenSelectorScreen(props: {
  client: ThirdwebClient;
  sourceTokens: SupportedTokens | undefined;
  sourceSupportedTokens: SupportedTokens | undefined;
  toChain: Chain;
  toToken: ERC20OrNativeToken;
  tokenAmount: string;
  mode: PayUIOptions["mode"];
  hiddenWallets?: WalletId[];
  onSelectToken: (wallet: Wallet, token: TokenInfo, chain: Chain) => void;
  onConnect: () => void;
  onPayWithFiat: () => void;
  fiatSupported: boolean;
}) {
  const connectedWallets = useConnectedWallets();
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  const chainInfo = useChainMetadata(props.toChain);
  const theme = useCustomTheme();

  const walletsAndBalances = useWalletsAndBalances({
    client: props.client,
    sourceSupportedTokens: props.sourceSupportedTokens || [],
    toChain: props.toChain,
    toToken: props.toToken,
    mode: props.mode,
  });

  if (
    walletsAndBalances.isLoading ||
    chainInfo.isLoading ||
    !chainInfo.data ||
    !props.sourceSupportedTokens
  ) {
    return <LoadingScreen />;
  }

  const filteredWallets = Array.from(walletsAndBalances.data?.entries() || [])
    .filter(([w]) => !props.hiddenWallets?.includes(w.id))
    .filter(([, balances]) => {
      const hasEnoughBalance = balances.some((b) => b.balance.value > 0);
      return hasEnoughBalance;
    });

  return (
    <Container
      animate="fadein"
      style={{
        minHeight: "200px",
      }}
    >
      {filteredWallets.length === 0 ? (
        <Container flex="column" gap="xs" py="lg">
          <Text size="xs" color="secondaryText" center>
            No suitable payment token found
            <br />
            in connected wallets
          </Text>
        </Container>
      ) : (
        <Container flex="column" gap="xs">
          <Text size="sm">Select payment token</Text>
          <Spacer y="xs" />
        </Container>
      )}
      <Container
        scrollY
        style={{
          maxHeight: "350px",
        }}
      >
        <Container flex="column" gap="sm">
          {filteredWallets.map(([w, balances]) => {
            const address = w.address;
            const wallet = connectedWallets.find(
              (w) => w.getAccount()?.address === address,
            );
            if (!wallet) return null;
            return (
              <WalletRowWithBalances
                key={w.id}
                wallet={wallet}
                balances={balances}
                client={props.client}
                address={address}
                onClick={(wallet, token, chain) => {
                  trackPayEvent({
                    event: "choose_payment_method_token",
                    client: props.client,
                    walletAddress: activeAccount?.address,
                    walletType: activeWallet?.id,
                    chainId: chain.id,
                    fromToken: isNativeToken(token) ? undefined : token.address,
                    toToken: isNativeToken(props.toToken)
                      ? undefined
                      : props.toToken.address,
                    toChainId: props.toChain.id,
                  });
                  props.onSelectToken(wallet, token, chain);
                }}
              />
            );
          })}
          {filteredWallets.length > 0 && <TextDivider text="OR" />}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              trackPayEvent({
                event: "choose_payment_method_another_wallet",
                client: props.client,
                walletAddress: activeAccount?.address,
                walletType: activeWallet?.id,
                toChainId: props.toChain.id,
                toToken: isNativeToken(props.toToken)
                  ? undefined
                  : props.toToken.address,
              });
              props.onConnect();
            }}
            bg="tertiaryBg"
            style={{
              border: `1px solid ${theme.colors.borderColor}`,
              padding: spacing.sm,
            }}
          >
            <Container
              flex="row"
              gap="sm"
              center="y"
              expand
              color="secondaryIconColor"
            >
              <OutlineWalletIcon size={iconSize.md} />
              <Text size="sm" color="primaryText">
                Pay with another wallet
              </Text>
            </Container>
          </Button>
          {props.fiatSupported && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                trackPayEvent({
                  event: "choose_payment_method_with_card",
                  client: props.client,
                  walletAddress: activeAccount?.address,
                  walletType: activeWallet?.id,
                  toChainId: props.toChain.id,
                  toToken: isNativeToken(props.toToken)
                    ? undefined
                    : props.toToken.address,
                });
                props.onPayWithFiat();
              }}
              bg="tertiaryBg"
              style={{
                border: `1px solid ${theme.colors.borderColor}`,
                padding: spacing.sm,
              }}
            >
              <Container
                flex="row"
                gap="sm"
                center="y"
                expand
                color="secondaryIconColor"
              >
                <CardStackIcon width={iconSize.md} height={iconSize.md} />
                <Text size="sm" color="primaryText">
                  Pay with card
                </Text>
              </Container>
            </Button>
          )}
        </Container>
      </Container>
    </Container>
  );
}

function WalletRowWithBalances(props: {
  client: ThirdwebClient;
  address: string;
  wallet: Wallet;
  balances: TokenBalance[];
  onClick: (wallet: Wallet, token: TokenInfo, chain: Chain) => void;
  hideConnectButton?: boolean;
}) {
  const theme = useCustomTheme();
  const displayedBalances = props.balances;
  const activeAccount = useActiveAccount();
  const { disconnect } = useDisconnect();
  const isActiveAccount = activeAccount?.address === props.address;

  return (
    <Container
      flex="column"
      style={{
        borderRadius: radius.lg,
        border: `1px solid ${theme.colors.borderColor}`,
      }}
    >
      <Container
        flex="row"
        gap="sm"
        bg="tertiaryBg"
        style={{
          justifyContent: "space-between",
          borderTopRightRadius: radius.lg,
          borderTopLeftRadius: radius.lg,
          padding: spacing.sm,
          paddingRight: spacing.xs,
          borderBottom: `1px solid ${theme.colors.borderColor}`,
        }}
      >
        <WalletRow {...props} />
        {!isActiveAccount && (
          <Button
            variant="ghost"
            onClick={() => disconnect(props.wallet)}
            style={{
              padding: spacing.xxs,
              color: theme.colors.secondaryText,
            }}
          >
            <Cross2Icon width={iconSize.sm} height={iconSize.sm} />
          </Button>
        )}
      </Container>
      <Container flex="column">
        {props.balances.length > 0 ? (
          displayedBalances.map((b, idx) => (
            <TokenBalanceRow
              client={props.client}
              onClick={() => props.onClick(props.wallet, b.token, b.chain)}
              key={`${b.token.address}-${b.chain.id}`}
              tokenBalance={b}
              wallet={props.wallet}
              style={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomRightRadius:
                  idx === displayedBalances.length - 1 ? radius.lg : 0,
                borderBottomLeftRadius:
                  idx === displayedBalances.length - 1 ? radius.lg : 0,
                borderBottom:
                  idx === displayedBalances.length - 1
                    ? "none"
                    : `1px solid ${theme.colors.borderColor}`,
              }}
            />
          ))
        ) : (
          <Container style={{ padding: spacing.sm }}>
            <Text size="sm" color="secondaryText">
              Insufficient Funds
            </Text>
          </Container>
        )}
      </Container>
    </Container>
  );
}

function TokenBalanceRow(props: {
  client: ThirdwebClient;
  tokenBalance: TokenBalance;
  wallet: Wallet;
  onClick: (token: TokenInfo, wallet: Wallet) => void;
  style?: React.CSSProperties;
}) {
  const { tokenBalance, wallet, onClick, client, style } = props;
  const chainInfo = useChainName(tokenBalance.chain);
  return (
    <StyledButton
      onClick={() => onClick(tokenBalance.token, wallet)}
      variant="secondary"
      style={{
        ...style,
        display: "flex",
        justifyContent: "space-between",
        minWidth: 0, // Needed for text truncation to work
      }}
    >
      <Container
        flex="row"
        center="y"
        gap="sm"
        style={{
          flex: "1 1 50%",
          minWidth: 0,
          maxWidth: "50%",
          overflow: "hidden",
          flexWrap: "nowrap",
        }}
      >
        <TokenIcon
          token={tokenBalance.token}
          chain={tokenBalance.chain}
          size="md"
          client={client}
        />
        <Container flex="column" gap="4xs" style={{ minWidth: 0 }}>
          <Text
            size="xs"
            color="primaryText"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tokenBalance.token.symbol}
          </Text>
          {chainInfo && (
            <Text
              size="xs"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {chainInfo.name}
            </Text>
          )}
        </Container>
      </Container>

      <Container
        flex="row"
        center="y"
        gap="4xs"
        color="secondaryText"
        style={{
          flex: "1 1 50%",
          maxWidth: "50%",
          minWidth: 0,
          justifyContent: "flex-end",
          flexWrap: "nowrap",
        }}
      >
        <Container
          flex="column"
          color="secondaryText"
          gap="4xs"
          style={{
            alignItems: "flex-end",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Text
            size="xs"
            color="primaryText"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {formatTokenBalance(tokenBalance.balance, true, 2)}
          </Text>
          <FiatValue
            tokenAmount={tokenBalance.balance.displayValue}
            token={tokenBalance.token}
            chain={tokenBalance.chain}
            client={client}
            size="xs"
          />
        </Container>
        <ChevronRightIcon
          width={iconSize.md}
          height={iconSize.md}
          style={{ flexShrink: 0 }}
        />
      </Container>
    </StyledButton>
  );
}

const StyledButton = /* @__PURE__ */ styled(Button)((props) => {
  const theme = useCustomTheme();
  return {
    background: "transparent",
    justifyContent: "space-between",
    flexWrap: "nowrap",
    flexDirection: "row",
    padding: spacing.sm,
    paddingRight: spacing.xs,
    gap: spacing.sm,
    "&:hover": {
      background: theme.colors.secondaryButtonBg,
      transform: "scale(1.01)",
    },
    transition: "background 200ms ease, transform 150ms ease",
    ...props.style,
  };
});

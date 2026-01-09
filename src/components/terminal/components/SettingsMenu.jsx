import { h } from "preact";
import { useContext, useRef } from "preact/hooks";
import ColorPickerButton from "../headers/ColorPickerButton.jsx";
import SoundToggleButton from "./SoundToggleButton.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import Menu from "../../buttons/MenuButton.jsx";
import { PopupContext } from "../../../popup/context.js";
import { useDeviceBreakpoint } from "../../../hooks/useDeviceBreakpoint.js";
import Avatar from "../../common/Avatar.jsx";

export const AboutPopupContent = ({ isMobile }) => {
  const creator = "tibfox";
  const profileUrl = `https://ecency.com/@${creator}`;
  const avatarSize = isMobile ? 120 : 160;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "center" : "flex-start",
        gap: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        <Avatar
          username={creator}
          size={avatarSize}
          link={profileUrl}
          fallbackChar={creator.charAt(0).toUpperCase()}
        />
        <div
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "600",
            color: "var(--color-primary-lighter)",
          }}
        >
          @{creator}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ lineHeight: 1.5, margin: 0 }}>
          This terminal and the Ōkinoko smart contracts are created by <b>@{creator}</b>. If you want to
          support his development work, feel free to send him a donation on Magi or Hive. Every bit of
          help is deeply appreciated.
        </p>
      </div>
    </div>
  );
};

export default function SettingsMenu() {
  const popup = useContext(PopupContext);
  const isMobile = useDeviceBreakpoint();
  const showInlineControls = isMobile !== false;

  // Refs to access the button elements
  const colorButtonRef = useRef(null);
  const soundButtonRef = useRef(null);
  const aboutButtonRef = useRef(null);

  return (
    <Menu
      title="Settings"
      closeOnOutsideClick={true}
      style={{ minWidth: "140px" }}
      trigger={
        <button
          style={{
            cursor: "pointer",
            display: "flex",
            fontSize: "var(--font-size-base)",
            color: "var(--color-primary-darker)",
            background: "none",
            border: "none",
          }}
        >
          <FontAwesomeIcon icon={faBars} style={{ fontSize: '0.9rem'}} />
        </button>
      }
    >
      <div style={{ color: "var(--color-primary)" }}>
        <table
          style={{
            borderCollapse: "separate",
            width: "100%",
          }}
        >
          <tbody>
            {showInlineControls && (
              <>
                <tr
                  onClick={() => {
                    const button = colorButtonRef.current?.querySelector('button');
                    button?.click();
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div ref={colorButtonRef}>
                      <ColorPickerButton />
                    </div>
                  </td>
                  <td style={{ padding: "4px 0" }}>Theme</td>
                </tr>

                <tr
                  onClick={() => {
                    const button = soundButtonRef.current?.querySelector('button');
                    button?.click();
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <div ref={soundButtonRef}>
                      <SoundToggleButton />
                    </div>
                  </td>
                  <td style={{ padding: "4px 0" }}>Sound</td>
                </tr>
              </>
            )}
            <tr
              onClick={() => aboutButtonRef.current?.click()}
              style={{ cursor: "pointer" }}
            >
              <td>
                <button
                  ref={aboutButtonRef}
                  type="button"
                  onClick={() =>
                    popup?.openPopup?.({
                      title: "About Ōkinoko",
                      body: () => <AboutPopupContent isMobile={isMobile} />,
                    })
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-primary)",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="About Ōkinoko"
                >
                  <FontAwesomeIcon icon={faCircleQuestion} style={{ fontSize: '0.9rem'}}/>
                </button>
              </td>
              <td style={{ padding: "4px 0" }}>About</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Menu>
  );
}

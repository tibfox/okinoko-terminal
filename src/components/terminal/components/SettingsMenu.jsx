import { h } from "preact";
import { useContext, useRef, useState } from "preact/hooks";
import ColorPickerButton from "../headers/ColorPickerButton.jsx";
import SoundToggleButton from "./SoundToggleButton.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import Menu from "../../buttons/MenuButton.jsx";
import { PopupContext } from "../../../popup/context.js";
import { useDeviceBreakpoint } from "../../../hooks/useDeviceBreakpoint.js";

export const AboutPopupContent = ({ isMobile }) => {
  const [avatarError, setAvatarError] = useState(false);
  const creator = "tibfox";
  const avatarUrl = `https://images.hive.blog/u/${creator}/avatar`;
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
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
          textDecoration: "none",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        {!avatarError ? (
          <img
            src={avatarUrl}
            alt={`${creator} avatar`}
            onError={() => setAvatarError(true)}
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: "50%",
              border: "2px solid var(--color-primary)",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: "50%",
              border: "2px solid var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-primary-darkest)",
              fontSize: "2rem",
            }}
          >
            {creator.charAt(0).toUpperCase()}
          </div>
        )}
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: "600",
            color: "var(--color-primary-lighter)",
          }}
        >
          @{creator}
        </div>
      </a>
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
            fontSize: "1.5rem",
            color: "var(--color-primary-darker)",
            background: "none",
            border: "none",
          }}
        >
          <FontAwesomeIcon icon={faBars} />
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
                  <FontAwesomeIcon icon={faCircleQuestion} />
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

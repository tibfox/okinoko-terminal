import { h } from "preact";
import { useContext } from "preact/hooks";
import ColorPickerButton from "./headers/ColorPickerButton.jsx";
import SoundToggleButton from "./SoundToggleButton.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import Menu from "../buttons/MenuButton.jsx";
import { PopupContext } from "../../popup/context.js";

export default function SettingsMenu() {
  const popup = useContext(PopupContext);

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
            <tr>
              <td > {/* ✅ column gap */}
                <ColorPickerButton />
              </td>
              <td style={{ padding: "4px 0" }}>Theme</td> {/* ✅ row padding */}
            </tr>

            <tr>
              <td >
                <SoundToggleButton />
              </td>
              <td style={{ padding: "4px 0" }}>Sound</td>
            </tr>
            <tr>
              <td>
                <button
                  type="button"
                  onClick={() =>
                    popup?.openPopup?.({
                      title: "About Ōkinoko",
                      body: () => (
                        <p style={{ lineHeight: 1.5 }}>
                          This terminal and the Ōkinoko smart contracts are created by <b>@tibfox</b>. If you want to
                          support his development work, feel free to send him a donation on Magi or Hive. Every bit of
                          help is deeply appreciated.
                        </p>
                      ),
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

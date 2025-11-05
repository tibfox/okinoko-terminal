import { h } from "preact";
import ColorPickerButton from "./headers/ColorPickerButton.jsx";
import SoundToggleButton from "./SoundToggleButton.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import Menu from "../buttons/MenuButton.jsx";

export default function SettingsMenu() {
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
          </tbody>
        </table>
      </div>
    </Menu>
  );
}

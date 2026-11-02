export const styleStudies = [
  {
    name: "The soft bob",
    detail: "Chin length · softly rounded",
    shade: "#493a32",
    skin: "#d6a886",
    variant: 0,
  },
  {
    name: "A little movement",
    detail: "Shoulder length · loose waves",
    shade: "#82604a",
    skin: "#edc7ad",
    variant: 1,
  },
  {
    name: "Easy layers",
    detail: "Long · face-framing layers",
    shade: "#3c302b",
    skin: "#b77a58",
    variant: 2,
  },
  {
    name: "The cropped cut",
    detail: "Short · textured shape",
    shade: "#a2998e",
    skin: "#e5b99e",
    variant: 3,
  },
  {
    name: "Natural curls",
    detail: "Rounded · defined curls",
    shade: "#2b2926",
    skin: "#956344",
    variant: 4,
  },
  {
    name: "A softer fringe",
    detail: "Mid length · light fringe",
    shade: "#915c42",
    skin: "#e7b590",
    variant: 5,
  },
  {
    name: "Silver lining",
    detail: "Chin length · side part",
    shade: "#b2aca0",
    skin: "#b8876a",
    variant: 0,
  },
  {
    name: "Long & familiar",
    detail: "Long · gentle waves",
    shade: "#b19a70",
    skin: "#f0c7a8",
    variant: 2,
  },
];

export function Portrait({
  variant = 0,
  shade = "#493a32",
  skin = "#d6a886",
  hat = false,
}: {
  variant?: number;
  shade?: string;
  skin?: string;
  hat?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 280"
      fill="none"
      role="img"
      aria-label={
        hat
          ? "Illustrated hat style, not an AI preview"
          : "Illustrated hairstyle, not an AI preview"
      }
    >
      <ellipse cx="122" cy="257" rx="93" ry="12" fill="#bbb29e" opacity=".15" />
      <path
        d="M45 274C46 224 72 213 99 209H144C176 214 199 229 200 274"
        fill={variant % 2 ? "#c8c8b4" : "#f5eddf"}
      />
      <path d="M99 172V211C110 229 132 231 144 211V172" fill={skin} />
      {variant === 4 ? (
        <path
          d="M62 169C27 158 38 124 46 113C22 87 48 48 68 49C76 19 111 26 121 32C148 12 178 34 179 48C211 49 220 82 203 99C226 122 200 159 187 163C184 196 149 205 129 188C105 208 71 199 62 169Z"
          fill={shade}
        />
      ) : variant === 3 ? (
        <path
          d="M62 126C47 78 61 44 96 39C121 18 173 32 184 69L180 132Z"
          fill={shade}
        />
      ) : (
        <path
          d={
            variant === 0
              ? "M54 172L52 103C48 54 80 30 122 31C170 29 189 66 189 103L191 175C161 190 91 194 54 172Z"
              : "M44 243C36 208 59 174 51 143C30 84 61 31 119 30C178 29 207 84 190 133C177 172 213 209 201 245C162 264 88 261 44 243Z"
          }
          fill={shade}
        />
      )}
      <ellipse cx="77" cy="128" rx="8" ry="14" fill={skin} />
      <ellipse cx="166" cy="128" rx="8" ry="14" fill={skin} />
      <path
        d="M77 95C76 63 166 57 168 97L162 151C159 176 140 192 123 192C103 192 82 174 79 151Z"
        fill={skin}
      />
      <path
        d="M99 176C108 183 137 183 145 174"
        stroke="#7e4f3d"
        strokeOpacity=".16"
        strokeWidth="2"
      />
      <path
        d="M90 118C95 115 103 115 108 118M136 118C141 114 150 115 153 118"
        stroke={shade}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M94 128C97 130 102 130 105 128M137 128C141 130 146 130 149 127"
        stroke="#5d473b"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M121 128L118 145L124 147"
        stroke="#916044"
        strokeOpacity=".5"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M111 162C117 166 128 166 134 161"
        stroke="#8d5749"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {variant === 5 ? (
        <path
          d="M64 117C52 75 76 40 118 41C170 37 187 73 177 116L158 99L153 76L144 107L87 101L81 124Z"
          fill={shade}
        />
      ) : variant === 3 ? (
        <path
          d="M68 116C53 69 79 42 113 40C153 32 183 55 178 101C143 98 131 70 131 70C114 97 90 104 68 116Z"
          fill={shade}
        />
      ) : (
        <path
          d="M63 135C42 86 70 36 117 38C166 29 192 71 179 134L163 120C170 86 143 68 139 64C122 96 91 99 77 104L75 142Z"
          fill={shade}
        />
      )}
      <path
        d="M70 82C83 53 105 48 124 49M166 61C178 74 181 89 177 104"
        stroke="white"
        strokeOpacity=".1"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M70 224L96 213C102 242 143 242 149 213L175 225M122 239V278"
        stroke="#a69f8e"
        strokeOpacity=".5"
        strokeWidth="1.2"
      />
      {hat && (
        <>
          <path d="M61 92C59 12 177 11 182 92Z" fill="#b99b7d" />
          <path
            d="M47 88C84 73 163 75 197 90L193 105C146 118 86 113 45 102Z"
            fill="#a8896b"
          />
          <path
            d="M71 53L170 53M66 67L176 67"
            stroke="#977a60"
            strokeOpacity=".4"
          />
        </>
      )}
    </svg>
  );
}

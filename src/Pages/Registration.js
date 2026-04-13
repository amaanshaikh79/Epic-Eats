import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { registerUser, setTokens, setStoredUser, sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP } from "../utils/api.js"
import "../css/Registration.css"

const Registration = () => {
  const navigate = useNavigate()

  // Form states
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState({})
  const [loading, setLoading] = useState(false)

  // Email OTP states
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtp, setEmailOtp] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [emailOtpLoading, setEmailOtpLoading] = useState(false)
  const [emailOtpMessage, setEmailOtpMessage] = useState("")
  const [emailCountdown, setEmailCountdown] = useState(0)

  // Phone OTP states
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)

  // Countdown timer helper
  const startCountdown = (setter) => {
    setter(30)
    const timer = setInterval(() => {
      setter(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Email OTP Flow ──
  const handleSendEmailOTP = async () => {
    if (!email.trim()) {
      setError(prev => ({ ...prev, email: "Email is required" }))
      return
    }
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(email)) {
      setError(prev => ({ ...prev, email: "Enter a valid email" }))
      return
    }

    setEmailOtpLoading(true)
    setEmailOtpMessage("")
    setError(prev => ({ ...prev, email: "", emailOtp: "" }))

    try {
      await sendEmailOTP(email)
      setEmailOtpSent(true)
      setEmailOtpMessage("Verification code sent! Check your email.")
      startCountdown(setEmailCountdown)
    } catch (err) {
      setError(prev => ({ ...prev, email: err.message }))
    } finally {
      setEmailOtpLoading(false)
    }
  }

  const handleVerifyEmailOTP = async () => {
    if (!emailOtp.trim() || emailOtp.length !== 6) {
      setError(prev => ({ ...prev, emailOtp: "Enter the 6-digit code" }))
      return
    }

    setEmailOtpLoading(true)
    setEmailOtpMessage("")

    try {
      const result = await verifyEmailOTP(email, emailOtp)
      if (result.success) {
        setEmailVerified(true)
        setEmailOtpMessage("✅ Email verified!")
      } else {
        setError(prev => ({ ...prev, emailOtp: result.message }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, emailOtp: err.message }))
    } finally {
      setEmailOtpLoading(false)
    }
  }

  // ── Phone OTP Flow ──
  const handleSendOTP = async () => {
    if (!phone.trim()) {
      setError(prev => ({ ...prev, phone: "Phone number is required" }))
      return
    }
    const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`

    setOtpLoading(true)
    setOtpMessage("")
    setError(prev => ({ ...prev, phone: "", otp: "" }))

    try {
      await sendOTP(phoneClean)
      setOtpSent(true)
      setOtpMessage("OTP sent! Check your phone.")
      startCountdown(setOtpCountdown)
    } catch (err) {
      setError(prev => ({ ...prev, phone: err.message }))
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError(prev => ({ ...prev, otp: "Enter the 6-digit OTP" }))
      return
    }
    const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`

    setOtpLoading(true)
    setOtpMessage("")

    try {
      const result = await verifyOTP(phoneClean, otp)
      if (result.success) {
        setPhoneVerified(true)
        setOtpMessage("✅ Phone verified!")
      } else {
        setError(prev => ({ ...prev, otp: result.message }))
      }
    } catch (err) {
      setError(prev => ({ ...prev, otp: err.message }))
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Form Validation ──
  const validateForm = () => {
    let errors = {}
    if (!fullName.trim()) errors.fullName = "Full name is required"
    if (!email.trim()) errors.email = "Email is required"
    else if (!emailVerified) errors.email = "Please verify your email first"
    if (!phone.trim()) errors.phone = "Phone number is required"
    else if (!phoneVerified) errors.phone = "Please verify your phone number first"
    if (!password) errors.password = "Password is required"
    else if (password.length < 6) errors.password = "Password must be at least 6 characters"
    if (!confirmPassword) errors.confirmPassword = "Confirm password is required"
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match"

    setError(errors)
    return Object.keys(errors).length === 0
  }

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError({})

    try {
      const phoneClean = phone.startsWith("+") ? phone : `+91${phone}`
      const data = await registerUser({ fullName, email, password, phone: phoneClean })
      setTokens(data.accessToken, data.refreshToken)
      setStoredUser(data.user)
      setFullName("")
      setEmail("")
      setPhone("")
      setPassword("")
      setConfirmPassword("")
      navigate("/")
    } catch (err) {
      setError({ server: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        {error.server && (
          <p className="error-text" style={{ textAlign: "center", marginBottom: "10px" }}>
            {error.server}
          </p>
        )}

        {/* Full Name */}
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        {error.fullName && <p className="error-text">{error.fullName}</p>}

        {/* Email + OTP Verification */}
        <div className="phone-otp-section">
          <div className="phone-input-row">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailVerified) {
                  setEmailVerified(false)
                  setEmailOtpSent(false)
                  setEmailOtp("")
                }
              }}
              disabled={emailVerified}
              className={emailVerified ? "verified-input" : ""}
            />
            {!emailVerified && (
              <button
                type="button"
                className="otp-send-btn"
                onClick={handleSendEmailOTP}
                disabled={emailOtpLoading || emailCountdown > 0}
              >
                {emailOtpLoading ? "Sending..." : emailCountdown > 0 ? `Resend (${emailCountdown}s)` : emailOtpSent ? "Resend" : "Verify"}
              </button>
            )}
            {emailVerified && <span className="verified-badge">✅</span>}
          </div>

          {emailOtpSent && !emailVerified && (
            <div className="otp-verify-row">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-input"
              />
              <button
                type="button"
                className="otp-verify-btn"
                onClick={handleVerifyEmailOTP}
                disabled={emailOtpLoading}
              >
                {emailOtpLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {emailOtpMessage && (
            <p className={`otp-message ${emailVerified ? "success" : ""}`}>{emailOtpMessage}</p>
          )}
          {error.email && <p className="error-text">{error.email}</p>}
          {error.emailOtp && <p className="error-text">{error.emailOtp}</p>}
        </div>

        {/* Phone + OTP Verification */}
        <div className="phone-otp-section">
          <div className="phone-input-row">
            <input
              type="tel"
              placeholder="Phone Number (e.g. 9876543210)"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                if (phoneVerified) {
                  setPhoneVerified(false)
                  setOtpSent(false)
                  setOtp("")
                }
              }}
              disabled={phoneVerified}
              className={phoneVerified ? "verified-input" : ""}
            />
            {!phoneVerified && (
              <button
                type="button"
                className="otp-send-btn"
                onClick={handleSendOTP}
                disabled={otpLoading || otpCountdown > 0}
              >
                {otpLoading ? "Sending..." : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : otpSent ? "Resend OTP" : "Send OTP"}
              </button>
            )}
            {phoneVerified && <span className="verified-badge">✅</span>}
          </div>

          {otpSent && !phoneVerified && (
            <div className="otp-verify-row">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="otp-input"
              />
              <button
                type="button"
                className="otp-verify-btn"
                onClick={handleVerifyOTP}
                disabled={otpLoading}
              >
                {otpLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
          )}

          {otpMessage && (
            <p className={`otp-message ${phoneVerified ? "success" : ""}`}>{otpMessage}</p>
          )}
          {error.phone && <p className="error-text">{error.phone}</p>}
          {error.otp && <p className="error-text">{error.otp}</p>}
        </div>

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error.password && <p className="error-text">{error.password}</p>}

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error.confirmPassword && <p className="error-text">{error.confirmPassword}</p>}

        <button type="submit" disabled={loading || !emailVerified || !phoneVerified}>
          {loading ? "Signing Up..." : "Sign Up"}
        </button>

        <p className="login-link">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}

export default Registration

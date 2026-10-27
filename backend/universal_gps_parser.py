import re
import datetime

class UniversalGPSParser:
    """
    Comprehensive class for parsing GPS tracker data.
    Consolidates logic from:
    - gps_tracker.py (Main data parser)
    - monitor_gps_server_v2.py (Heartbeat/Regex parser)
    - gps_server.py / test_gps.py (Message type identification)
    """
    
    @staticmethod
    def parse_message(message):
        """
        Main entry point. Inspects the message and routes to the appropriate parser.
        """
        if not message or not isinstance(message, str):
            return None
            
        message = message.strip()
        
        # 1. Standard Data Packet (imei:...)
        # Handled by gps_tracker.py logic and monitor_gps_server_v2.py
        if message.startswith('imei:'):
            return UniversalGPSParser.parse_standard_data(message)
            
        # 2. Simple Heartbeat (Just IMEI)
        # Handled by monitor_gps_server_v2.py
        # Pattern: 15 digits followed by semicolon
        if re.match(r'^\d{15};?$', message):
            return {
                'type': 'heartbeat_simple',
                'imei': message.strip(';')
            }

        # 3. Command/Heartbeat (##,imei:...)
        # Observed in gps_server.py and test_gps.py
        if message.startswith('##,imei:'):
            return UniversalGPSParser.parse_command_heartbeat(message)

        # 4. HQ Data Packet (*HQ,...)
        # Observed in gps_server.py and test_gps.py
        if message.startswith('*HQ,'):
            return UniversalGPSParser.parse_hq_data(message)

        return None

    @staticmethod
    def parse_standard_data(message):
        """
        Parses the standard comma-separated data packet.
        Based on gps_tracker.py logic (most comprehensive).
        """
        try:
            if not message.strip().endswith(';'):
                # Some devices might omit the semicolon, but strict parser expects it.
                # monitor_gps_server_v2 doesn't enforce it strictly in regex, but gps_tracker does.
                pass

            parts = message.strip(';').split(',')
            
            # Extract IMEI
            imei_match = re.match(r'imei:(\d+)', parts[0])
            if not imei_match:
                return None
            imei = imei_match.group(1)

            # Need enough parts for basic location
            if len(parts) < 12: 
                return None

            # Parse datetime
            # Format usually YYMMDDHHMM
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            if len(parts) > 2:
                date_time = parts[2]
                if len(date_time) >= 10:
                    # Format is DDMMYYHHMM(SS)
                    day = date_time[0:2]
                    month = date_time[2:4]
                    year = '20' + date_time[4:6]
                    hour = date_time[6:8]
                    minute = date_time[8:10]
                    # Parse seconds if available, otherwise 00
                    seconds = date_time[10:12] if len(date_time) >= 12 else '00'
                    timestamp = f"{year}-{month}-{day} {hour}:{minute}:{seconds}Z"

            # GPS Status
            gps_status = parts[4] if len(parts) > 4 else 'V' # 'F'/'A' for valid
            is_valid = gps_status == 'F' or gps_status == 'A'

            result = {
                'type': 'location_update',
                'format': 'standard',
                'imei': imei,
                'timestamp': timestamp,
                'sim_number': parts[3] if len(parts) > 3 else None,
                'gps_status': gps_status,
                'raw_data': message
            }
            
            # Coordinate parsing
            # Expecting DDMM.MMMM format in parts[7] (lat) and parts[9] (lon) for standard packets
            # But indices might vary slightly. gps_tracker.py uses:
            # Lat: 7, LatDir: 8, Lon: 9, LonDir: 10
            
            if len(parts) > 10:
                raw_lat = parts[7]
                lat_dir = parts[8]
                raw_lon = parts[9]
                lon_dir = parts[10]
                
                result['latitude'] = UniversalGPSParser._convert_ddmm_to_decimal(raw_lat, lat_dir)
                result['longitude'] = UniversalGPSParser._convert_ddmm_to_decimal(raw_lon, lon_dir)
            
            # Other fields
            if len(parts) > 11:
                result['speed'] = float(parts[11]) if parts[11] else 0.0
            
            if len(parts) > 12:
                result['direction'] = float(parts[12]) if parts[12] else 0.0
                
            if len(parts) > 13:
                result['altitude'] = float(parts[13]) if parts[13] else 0.0

            # Extended fields (Fuel, etc) - generic extraction
            # gps_tracker.py specific mappings:
            if len(parts) > 16:
                if '%' in parts[16]:
                    result['fuel_tank1'] = float(parts[16].strip('%'))
            if len(parts) > 17:
                if '%' in parts[17]:
                    result['fuel_tank2'] = float(parts[17].strip('%'))

            return result
        except Exception as e:
            print(f"Error parsing standard data: {e}")
            return None

    @staticmethod
    def parse_command_heartbeat(message):
        """
        Parses ##,imei:NUMBER,A
        """
        try:
            parts = message.strip().split(',')
            imei_part = parts[1]
            if imei_part.startswith('imei:'):
                imei = imei_part.split(':')[1]
                return {
                    'type': 'heartbeat_command',
                    'imei': imei,
                    'status': parts[2].strip(';') if len(parts) > 2 else None,
                    'raw_data': message
                }
        except Exception:
            pass
        return None

    @staticmethod
    def parse_hq_data(message):
        """
        Parses *HQ data.
        Example: *HQ,359586018966098,V1,123519,A,3123.1234,N,00433.9876,E,0.08,0,231023,0,0,0,0,0,0,0,0#
        """
        try:
            # Strip *HQ, and #
            content = message.strip()
            if content.endswith('#'): 
                content = content[:-1]
                
            parts = content.split(',')
            
            if len(parts) < 10:
                return None
                
            imei = parts[1]
            time_str = parts[3] # HHMMSS
            status = parts[4] # A = Valid
            
            raw_lat = parts[5]
            lat_dir = parts[6]
            raw_lon = parts[7]
            lon_dir = parts[8]
            
            speed = parts[9]
            date_str = parts[11] # DDMMYY
            
            # Construct timestamp
            # Date: DDMMYY -> 20YY-MM-DD
            day = date_str[0:2]
            month = date_str[2:4]
            year = '20' + date_str[4:6]
            
            hour = time_str[0:2]
            minute = time_str[2:4]
            second = time_str[4:6]
            
            timestamp = f"{year}-{month}-{day} {hour}:{minute}:{second}Z"
            
            result = {
                'type': 'location_update',
                'format': 'hq',
                'imei': imei,
                'timestamp': timestamp,
                'gps_status': status,
                'raw_data': message,
                'latitude': UniversalGPSParser._convert_ddmm_to_decimal(raw_lat, lat_dir),
                'longitude': UniversalGPSParser._convert_ddmm_to_decimal(raw_lon, lon_dir),
                'speed': float(speed) if speed else 0.0
            }
            return result
            
        except Exception as e:
            print(f"Error parsing HQ data: {e}")
            return None

    @staticmethod
    def _convert_ddmm_to_decimal(coord_str, direction):
        """
        Helper to convert DDMM.MMMM format to decimal degrees.
        """
        try:
            if not coord_str or not direction:
                return None
                
            val = float(coord_str)
            
            # Degrees is integer part / 100
            deg = int(val / 100)
            
            # Minutes is the remainder
            mins = val - (deg * 100)
            
            # Decimal = degrees + minutes/60
            decimal = deg + (mins / 60)
            
            # Apply direction
            if direction.upper() in ['S', 'W']:
                decimal = -decimal
                
            return decimal
        except ValueError:
            return None


# Example usage
if __name__ == "__main__":
    parser = UniversalGPSParser()
    
    # Test cases
    test_messages = [
        "imei:1234567,tracker,230520120000,,F,120000,A,3124.5678,N,12124.5678,E,0.00,0,10.0,0,0,80%,80%,25;",
        "123456789012345;",
        "##,imei:359586018966098,A",
        "*HQ,359586018966098,V1,123519,A,3123.1234,N,00433.9876,E,0.08,0,231023,0,0,0,0,0,0,0,0#",
        "imei:359586018966098,help me,090226184525,,F,184525,A,3334.1896,N,00735.2403,W,0.0,;"
    ]
    
    print("Testing Universal GPS Parser:")
    for msg in test_messages:
        print(f"\nInput: {msg}")
        result = parser.parse_message(msg)
        print(f"Result: {result}")

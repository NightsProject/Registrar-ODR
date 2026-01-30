"""
Utility functions for handling Philippine time (UTC+8).
"""
import datetime
import pytz

def get_philippine_time():
    """
    Get current Philippine time (UTC+8).
    
    Returns:
        datetime.datetime: Current time in Philippine timezone
    """
    philippine_tz = pytz.timezone('Asia/Manila')
    return datetime.datetime.now(philippine_tz)

def get_philippine_time_info():
    """
    Get current Philippine time information.
    
    Returns:
        dict: Contains current_time, current_day, current_date_str, current_time_only
    """
    now_ph = get_philippine_time()
    
    return {
        'current_time': now_ph.time(),
        'current_day': now_ph.strftime('%A'),  # e.g., 'Monday'
        'current_date_str': now_ph.strftime('%Y-%m-%d'),  # e.g., '2024-12-25'
        'current_time_only': now_ph.time(),
        'datetime_object': now_ph
    }

def parse_time_string(time_str):
    """
    Parse a time string (HH:MM:SS) into a time object.
    
    Args:
        time_str (str): Time string in format 'HH:MM:SS'
        
    Returns:
        datetime.time: Parsed time object or None if invalid
    """
    try:
        return datetime.datetime.strptime(time_str, '%H:%M:%S').time()
    except ValueError:
        return None

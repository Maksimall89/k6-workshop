import http from 'k6/http';

export default function () {

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    let res = http.get('http://test.k6.io', params);

}


